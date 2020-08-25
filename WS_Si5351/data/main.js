async function main() {

var slider0 = new Slider({ min:0, max:200 });
var spinner0 = new Spinner({ label:'C0', units:'Hz', width:'250px', min:0, max:200e6 });
var textbox0 = new Textbox({ label:'ステップ', width:'200px', type:'number' });
var slider1 = new Slider({ min:0, max:200 });
var spinner1 = new Spinner({ label:'C1', units:'Hz', width:'250px', min:0, max:200e6 });
var textbox1 = new Textbox({ label:'ステップ', width:'200px', type:'number' });
var slider2 = new Slider({ min:0, max:200 });
var spinner2 = new Spinner({ label:'C2', units:'Hz', width:'250px', min:0, max:200e6 });
var textbox2 = new Textbox({ label:'ステップ', width:'200px', type:'number' });

var body = new Body();
body.push([slider0, spinner0, textbox0]);
body.push([slider1, spinner1, textbox1]);
body.push([slider2, spinner2, textbox2]);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.11');

async function sliderChange(spinner, clk, value) {
  var v = value / 200.0 * 200e6;
  spinner.value = v;

  var freq = Math.round(v)
  await esp32.sendText(`${clk} ${freq}`);
}

async function spinnerChange(slider, clk, value) {
  var v = Math.round(value / 200e6 * 200.0);
  slider.value = v;

  var freq = Math.round(value)
  await esp32.sendText(`${clk} ${freq}`);
}

slider0.change = async function(value) {
  await sliderChange(spinner0, 'C0', value);
};

spinner0.change = async function(value) {
  await spinnerChange(slider0, 'C0', value);
};

textbox0.change = async function(value) {
  spinner0.step = value;
};

slider1.change = async function(value) {
  await sliderChange(spinner1, 'C1', value);
};

spinner1.change = async function(value) {
  await spinnerChange(slider1, 'C1', value);
};

textbox1.change = async function(value) {
  spinner1.step = value;
};

slider2.change = async function(value) {
  await sliderChange(spinner2, 'C2', value);
};

spinner2.change = async function(value) {
  await spinnerChange(slider2, 'C2', value);
};

textbox2.change = async function(value) {
  spinner2.step = value;
};

spinner0.value = 1e6; await spinner0.change(1e6);
textbox0.value = 1e3; await textbox0.change(1e3);
spinner1.value = 0; await spinner1.change(0);
textbox1.value = 1e3; await textbox1.change(1e3);
spinner2.value = 0; await spinner2.change(0);
textbox2.value = 1e3; await textbox2.change(1e3);

}
