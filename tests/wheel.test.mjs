import test from 'node:test';
import assert from 'node:assert/strict';
import { wheelPixels, stepSelection, stepRange, INITIAL_WHEEL_STATE } from '../src/frontend/wheel.ts';
const names=['first','second','third','fourth'];

test('one notch selects exactly one item; repeated scroll never freezes at boundaries',()=>{
 let state=INITIAL_WHEEL_STATE, value='first';
 for(let i=0;i<12;i++){
  const result=stepSelection(names,value,120,i*40,state);
  value=result.value;state=result.state;
  assert.equal(result.changed,true);
 }
 assert.equal(value,'first');
});
test('trackpad small deltas accumulate and reset after pauses or reversal',()=>{
 let state=INITIAL_WHEEL_STATE,value='first';
 for(const [i,delta] of [15,15,15].entries()){
  const result=stepSelection(names,value,delta,i*25,state);value=result.value;state=result.state;
 }
 assert.equal(value,'first');
 const fourth=stepSelection(names,value,16,100,state);
 assert.equal(fourth.value,'second');
 const reset=stepSelection(names,fourth.value,20,900,fourth.state);
 assert.equal(reset.value,'second');
 const reverse=stepSelection(names,reset.value,-80,920,reset.state);
 assert.equal(reverse.value,'first');
});
test('line and page scroll are normalized; vertical or horizontal wheel works',()=>{
 assert.equal(wheelPixels(0,4,1,600),64);
 assert.equal(wheelPixels(3,0,2,400),1200);
 assert.equal(wheelPixels(100,25,0,600),100);
 assert.equal(wheelPixels(Infinity,0,0,600),0);
});
test('selected items can be swapped externally and immediately cycled',()=>{
 const result=stepSelection(names,'third',120,1,INITIAL_WHEEL_STATE);
 assert.equal(result.value,'fourth');
 const next=stepSelection(names,'first',120,50,result.state);
 assert.equal(next.value,'second');
});


test('range wheel: up increases, down decreases by five and clamps without wrap',()=>{
 const up=stepRange(100,60,220,5,-120,10,INITIAL_WHEEL_STATE);
 assert.equal(up.value,105);
 const down=stepRange(up.value,60,220,5,120,40,up.state);
 assert.equal(down.value,100);
 const top=stepRange(220,60,220,5,-120,70,down.state);
 assert.equal(top.value,220); assert.equal(top.changed,false);
 const bottom=stepRange(60,60,220,5,120,100,top.state);
 assert.equal(bottom.value,60); assert.equal(bottom.changed,false);
});

test('range trackpad deltas accumulate; a reversed gesture discards previous residual',()=>{
 const first=stepRange(100,60,260,5,-12,1,INITIAL_WHEEL_STATE);
 assert.equal(first.changed,false);
 const second=stepRange(100,60,260,5,-14,20,first.state);
 const third=stepRange(100,60,260,5,-24,40,second.state);
 assert.equal(third.value,105);
 const reverse=stepRange(105,60,260,5,15,70,third.state);
 assert.equal(reverse.value,105);
 const expiry=stepRange(105,60,260,5,16,400,reverse.state);
 assert.equal(expiry.value,105);
 const final=stepRange(105,60,260,5,38,430,expiry.state);
 assert.equal(final.value,100);
});

test('range wheel rejects invalid inputs and never returns out-of-range values',()=>{
 for(const delta of [NaN,0,Infinity]){
  const result=stepRange(100,60,220,5,delta,1,INITIAL_WHEEL_STATE);
  assert.equal(result.value,100);
  assert.equal(result.changed,false);
 }
 assert.equal(stepRange(100,100,100,5,120,1,INITIAL_WHEEL_STATE).value,100);
 assert.equal(stepRange(100,60,220,0,120,1,INITIAL_WHEEL_STATE).value,100);
});
