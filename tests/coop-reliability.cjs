const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let now=0,id=0,timers=new Map();const later=(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id};
function advance(ms){now+=ms;for(const [i,t] of [...timers])if(t.at<=now){timers.delete(i);t.fn()}}
const scope={module:{exports:{}},setTimeout:later,clearTimeout:i=>timers.delete(i)};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../multiplayer-session.js'),'utf8'),scope);
let rtc,lost=0,received=[],latency=160,drop=false;
class RTC{constructor(){rtc=this;this.channels={};this.connectionState='new';}createDataChannel(label){return this.channels[label]={label,readyState:'open',bufferedAmount:0,close(){},send:raw=>{if(!drop)later(()=>received.push(raw),latency)}}}close(){}}
const p=scope.module.exports.peer({host:true,RTC,onLost:()=>lost++});
p.sendState('delayed');assert.equal(received.length,0);advance(160);assert.deepEqual(received,['delayed']);
drop=true;p.sendState('lost');advance(1000);assert.equal(received.length,1);drop=false;p.sendState('recovered');advance(160);assert.equal(received.at(-1),'recovered');
rtc.connectionState='disconnected';rtc.onconnectionstatechange();advance(2000);rtc.connectionState='connected';rtc.onconnectionstatechange();advance(4000);assert.equal(lost,0,'Brief disconnect must recover');
rtc.channels.state.bufferedAmount=131073;assert.equal(p.sendState('backpressure'),false);rtc.channels.state.bufferedAmount=0;
rtc.connectionState='failed';rtc.onconnectionstatechange();assert.equal(lost,1);rtc.onconnectionstatechange();assert.equal(lost,1);p.close();assert.equal(timers.size,0);
assert.throws(()=>scope.module.exports.peer({RTC:null}),/NOT SUPPORTED/);
console.log('PASS: latency, packet loss, backpressure, brief disconnect recovery, failed connection and timer cleanup.');
