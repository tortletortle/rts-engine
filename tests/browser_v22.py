from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.set_content((root/'index.html').read_text(),wait_until='load');page.wait_for_timeout(200)
    initial=page.evaluate("({title:document.title,points:a.points.length,units:a.units.length,rows:document.querySelectorAll('.point-row').length,score:document.querySelector('#territory').innerText})")
    assert initial['points']==initial['rows']==5 and initial['units']==200
    page.select_option('#scale','24');page.click('#reset')
    u=page.evaluate("(()=>{const u=a.units.find(u=>!u.side&&u.layer==='ground'),r=c.getBoundingClientRect();return {id:u.id,x:r.left+u.x/1200*r.width,y:r.top+u.y/800*r.height}})()")
    page.mouse.click(u['x'],u['y']); assert page.evaluate('a.selected.size')==1
    page.locator('[data-point="A"] button').click();assert page.evaluate('a.pending.x')==365
    page.evaluate('for(let i=0;i<500;i++)a.step();draw()')
    tactical=page.evaluate("({time:a.t,owner:a.points[0].owner,pointStates:a.points.map(p=>[p.id,p.owner]),vp:a.vp,overlaps:a.audit().overlaps,score:document.querySelector('#territory').innerText})")
    assert tactical['owner']==0, tactical
    assert tactical['overlaps']==0
    page.screenshot(path=str(root/'artifacts'/'preview.png'),full_page=True)
    page.select_option('#scale','1000');page.click('#reset');assert page.evaluate('a.units.length')==1000
    page.select_option('#speed','4');page.click('#play');page.wait_for_timeout(2200);page.click('#play')
    scale=page.evaluate("({time:a.t,units:a.units.length,air:a.audit().airUnits,overlaps:a.audit().overlaps,points:a.points.length})")
    assert scale['time']>0 and scale['overlaps']==0
    t=scale['time'];page.wait_for_timeout(200);assert page.evaluate('a.t')==t
    assert not errors,errors
    print(json.dumps({'initial':initial,'tactical':tactical,'scale1000':scale,'errors':errors,'checks':'PASS'},ensure_ascii=False,indent=2))
    # Mobile viewport sanity check; no wide viewport overflow and tactical controls reachable.
    phone=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    phone.set_content((root/'index.html').read_text(),wait_until='load');phone.wait_for_timeout(100)
    mobile=phone.evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,points:document.querySelectorAll('.point-row').length})")
    assert mobile['scrollWidth']<=mobile['width']+1 and mobile['points']==5,mobile
    print('MOBILE '+json.dumps(mobile))
    browser.close()
