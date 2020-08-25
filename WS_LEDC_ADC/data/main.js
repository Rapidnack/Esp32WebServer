async function main() {

var slider0 = new Slider({ min:500, max:2500, step:10 });
var spinner0 = new Spinner({ label:'LEDC (pin 27)', units:'ms', width:'100px', min:0.5, max:2.5, step:0.1 });
var slider1 = new Slider({ min:500, max:2500, step:10 });
var spinner1 = new Spinner({ label:'LEDC (pin 16)', units:'ms', width:'100px', min:0.5, max:2.5, step:0.1 });
var slider2 = new Slider({ min:500, max:2500, step:10 });
var spinner2 = new Spinner({ label:'LEDC (pin 17)', units:'ms', width:'100px', min:0.5, max:2.5, step:0.1 });
var button1 = new Button('取得開始');
var button2 = new Button('取得停止');
var chart1 = new LineChart({ label:'ADC0 (pin 36)', scales:'millisecond' });

var body = new Body();
body.push([slider0, spinner0]);
body.push([slider1, spinner1]);
body.push([slider2, spinner2]);
body.push([button1, button2]);
body.push(chart1);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.13');

sliderChange = async function(spinner, chan, value) {
  var v = value / 2500.0 * 2.5;
  spinner.value = v;

  var duty = Math.round(v / 20.0 * 65536.0)
  await esp32.sendText(`ledcWrite ${chan} ${duty}`);
};

spinnerChange = async function(slider, chan, value) {
  var v = Math.round(value / 2.5 * 2500.0);
  slider.value = v;

  var duty = Math.round(value / 20.0 * 65536.0)
  await esp32.sendText(`ledcWrite ${chan} ${duty}`);
};

slider0.change = async function(value) {
  await sliderChange(spinner0, 0, value);
};

spinner0.change = async function(value) {
  await spinnerChange(slider0, 0, value);
};

slider1.change = async function(value) {
  await sliderChange(spinner1, 1, value);
};

spinner1.change = async function(value) {
  await spinnerChange(slider1, 1, value);
};

slider2.change = async function(value) {
  await sliderChange(spinner2, 2, value);
};

spinner2.change = async function(value) {
  await spinnerChange(slider2, 2, value);
};

var stopFlag12;
button1.click = async function() {
  button1.disable();

  var adcScale = 3.3;
  await esp32.sendText('analogSetPinAttenuation 36 ADC_11db');

  stopFlag12 = false;
  while (!stopFlag12) {
    var s = await esp32.sendQueryText('analogFastRead 36 300');
    var a = s.split(' ');
    var samples = parseInt(a[0]) / 2;
    var data = [];
    for (var i = 0; i < samples; i++) {
      var x = parseInt(a[2 + 2 * i]) / 1000.0; // us -> ms
      var y = parseInt(a[1 + 2 * i]) * adcScale / 4096.0;
      data.push([x, y]);
    }

    data.sort(function(a, b) { return a[0] - b[0]; });
    var trigPos = (samples * 10) / 100;
    var trigX = data[trigPos][0];
    for (var i = 0; i < data.length; i++) {
      data[i][0] = data[i][0] - trigX;
    }

    chart1.setData(data);
    await sleep(0.1);
  }

  button1.enable();
};

button2.click = async function() {
  stopFlag12 = true;
};

await esp32.sendText('ledcSetup 0 50 16'); // chan0 50Hz 16bits
await esp32.sendText('ledcAttachPin 27 0'); // pin 27 chan0
await esp32.sendText('ledcSetup 1 50 16'); // chan1 50Hz 16bits
await esp32.sendText('ledcAttachPin 16 1'); // pin 16 chan1
await esp32.sendText('ledcSetup 2 50 16'); // chan2 50Hz 16bits
await esp32.sendText('ledcAttachPin 17 2'); // pin 17 chan2
spinner0.value = 1.5; await spinner0.change(1.5);
spinner1.value = 1.5; await spinner1.change(1.5);
spinner2.value = 1.5; await spinner2.change(1.5);

}
