const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');
const assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const core = html.split('<script>')[1].split('</script>')[0].split('let a,run=false;')[0];
const ctx = vm.createContext({ performance, console });
vm.runInContext(core, ctx, { timeout: 120000 });
const { Strategy, Battle, PIBT, TYPES, damage } = ctx;
const results = [];
function test(name, fn) {
  const t = performance.now();
  try { const detail = fn(); results.push({name, status:'PASS', ms:+(performance.now()-t).toFixed(1), detail}); }
  catch (e) { results.push({name, status:'FAIL', ms:+(performance.now()-t).toFixed(1), error:e.stack||String(e)}); }
}

test('V2.1 basic strategy initialization', () => {
  const g = new Strategy(24);
  assert.equal(g.units.length, 24);
  assert.equal(g.buildings.filter(b=>b.type==='hq').length,2);
  assert(g.units.some(u=>u.layer==='air'));
  assert(g.units.some(u=>u.layer==='ground'));
  assert.equal(g.audit().overlaps,0);
  return {units:g.units.length, air:g.audit().airUnits, ground:g.audit().groundUnits, buildings:g.buildings.length};
});


test('500-unit scale and base-area deployment', () => {
  const g = new Strategy(500);
  const side0=g.units.filter(u=>u.side===0),side1=g.units.filter(u=>u.side===1);
  const avg=(group,x,y)=>group.reduce((sum,u)=>sum+Math.hypot(u.x-x,u.y-y),0)/group.length;
  const d0=avg(side0,100,400),d1=avg(side1,1100,400);
  assert.equal(g.units.length,500);
  assert.equal(g.audit().overlaps,0);
  assert(d0<220&&d1<220, `units not staged near HQ: ${d0}, ${d1}`);
  return {units:g.units.length,side0AverageDistanceToHQ:+d0.toFixed(1),side1AverageDistanceToHQ:+d1.toFixed(1),overlaps:g.audit().overlaps};
});

test('aircraft can be produced from an airfield', () => {
  const g = new Strategy(24);
  g.cash[0]=2000;
  assert(g.place(0,'airfield'));
  assert(g.train(0,9));
  for(let i=0;i<120;i++)g.step();
  const helicopter=g.units.find(u=>u.id>=24&&u.kind===9);
  assert(helicopter, 'queued helicopter did not spawn');
  assert.equal(helicopter.layer,'air');
  assert.equal(helicopter.speed,34);
  return {id:helicopter.id,layer:helicopter.layer,speed:helicopter.speed,units:g.units.length};
});

test('air navigation bypasses blocked terrain', () => {
  const g = new Battle(2,{types:{0:0,1:11}});
  const wallCell = 6*120+58; // inside the fixed vertical wall
  assert.equal(g.adj[wallCell].includes(wallCell), false);
  assert.equal(g.airAdj[wallCell].includes(wallCell), true);
  assert.equal(g.adjFor(g.units.find(u=>u.kind===11)), g.airAdj);
  return {groundBlocked:!g.adj[wallCell].includes(wallCell), airTraversable:g.airAdj[wallCell].includes(wallCell)};
});

test('air and ground may occupy the same x-y cell on separate layers', () => {
  const g = new Battle(2,{types:{0:0,1:11}});
  const ground = g.units.find(u=>u.layer==='ground');
  const air = g.units.find(u=>u.layer==='air');
  const p = 40*120+60;
  for (const u of [ground,air]) { u.p=p;u.q=p;u.x=605;u.y=405;u.goal=p;u.dist=g.distanceField(p,u.layer); }
  g.grid.clear();g.add(ground);g.add(air);
  g.decide();
  assert.equal(g.audit().overlaps,0);
  return {layers:[ground.layer,air.layer],sameCell:p};
});

test('unit movement speeds are differentiated', () => {
  const g = new Battle(2,{types:{0:2,1:11}});
  const heavy = g.units.find(u=>u.kind===2), uav = g.units.find(u=>u.kind===11);
  const before = new Map([[heavy.id,[heavy.x,heavy.y]],[uav.id,[uav.x,uav.y]]]);
  for(let i=0;i<100;i++) PIBT.prototype.step.call(g);
  const moved = u => Math.hypot(u.x-before.get(u.id)[0],u.y-before.get(u.id)[1]);
  const dHeavy=moved(heavy),dUav=moved(uav);
  assert(dUav>dHeavy*1.8, `expected UAV substantially faster: heavy=${dHeavy}, uav=${dUav}`);
  return {heavyPx:+dHeavy.toFixed(1),uavPx:+dUav.toFixed(1),speedHeavy:heavy.speed,speedUav:uav.speed};
});

test('air-defense counter table', () => {
  assert(damage(10,9)>0);
  assert.equal(damage(0,9),0);
  assert(damage(3,2)>damage(3,0));
  return {aaVsHelicopter:damage(10,9),cannonVsAircraft:damage(0,9),atMissileVsHeavy:damage(3,2)};
});

test('200-unit regression and movement', () => {
  const g = new Strategy(200);
  for(let i=0;i<60;i++) g.step();
  const a=g.audit();
  assert.equal(g.units.length,200);
  assert.equal(a.overlaps,0);
  assert(a.ticks>0);
  return {alive:g.units.filter(u=>!u.dead).length,air:a.airUnits,ground:a.groundUnits,overlaps:a.overlaps,plannerTicks:a.ticks,meanDecisionMs:+a.meanDecisionMs.toFixed(3),combatChecks:a.combatChecks};
});

test('1000-unit sustained battle, AI order and spatial combat index', () => {
  const g = new Strategy(1000);
  assert.equal(g.units.length,1000);
  const initial=g.units.map(u=>[u.id,u.x,u.y]);
  const t=performance.now();
  for(let i=0;i<100;i++) g.step();
  const runMs=performance.now()-t;
  const a=g.audit();
  const side1Moved=g.units.filter(u=>u.side===1).some(u=>{const b=initial[u.id];return Math.hypot(u.x-b[1],u.y-b[2])>2;});
  assert.equal(a.overlaps,0);
  assert.equal(g.units.filter(u=>!u.dead).length,1000);
  assert(side1Moved,'AI did not issue or execute a movement order');
  assert(a.combatChecks<10000000, `combat search still too broad: ${a.combatChecks}`);
  return {units:g.units.length,air:a.airUnits,ground:a.groundUnits,overlaps:a.overlaps,plannerTicks:a.ticks,simulatedSeconds:+g.t.toFixed(1),side1Moved,combatQueries:a.combatQueries,combatChecks:a.combatChecks,runMs:+runMs.toFixed(1),initMs:a.initMs};
});

console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.status==='FAIL')) process.exitCode=1;
