async function main() {

var slider0 = new Slider({ min:0, max:70 });
var spinner0 = new Spinner({ label:'周波数', units:'Hz', width:'200px', min:0, max:70e6 });
var textbox0 = new Textbox({ label:'ステップ', width:'200px', type:'number' });

var body = new Body();
body.push([slider0, spinner0, textbox0]);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.6');

slider0.change = async function(value) {
  var v = value / 70.0 * 70e6;
  spinner0.value = v;

  var freq = Math.round(v)
  await esp32.sendText(`F ${freq}`);
};

spinner0.change = async function(value) {
  var v = Math.round(value / 70e6 * 70.0);
  slider0.value = v;

  var freq = Math.round(value)
  await esp32.sendText(`F ${freq}`);
};

textbox0.change = async function(value) {
  spinner0.step = value;
};

spinner0.value = 1e6; await spinner0.change(1e6);
textbox0.value = 1e3; await textbox0.change(1e3);

}
