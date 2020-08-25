async function main() {

var slider1 = new Slider({ min:0, max:255 });
var spinner1 = new Spinner({ label:'DAC1 (pin 25)', width:'100px', min:0, max:255 });
var slider2 = new Slider({ min:0, max:255 });
var spinner2 = new Spinner({ label:'DAC2 (pin 26)', width:'100px', min:0, max:255 });
var button1 = new Button('取得開始');
var button2 = new Button('取得停止');
var chart1 = new LineChart(['ADC4 (pin 32)', 'ADC5 (pin 33)', 'ADC6 (pin 34)', 'ADC7 (pin 35)']);

var body = new Body();
body.push([slider1, spinner1]);
body.push([slider2, spinner2]);
body.push([button1, button2]);
body.push(chart1);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.13');

slider1.change = async function(value) {
  spinner1.value = value;
  await esp32.sendText(`dacWrite 25 ${value}`);
};

spinner1.change = async function(value) {
  slider1.value = value;
  await esp32.sendText(`dacWrite 25 ${value}`);
};

slider2.change = async function(value) {
  spinner2.value = value;
  await esp32.sendText(`dacWrite 26 ${value}`);
};

spinner2.change = async function(value) {
  slider2.value = value;
  await esp32.sendText(`dacWrite 26 ${value}`);
};

var stopFlag12;
button1.click = async function() {
  button1.disable();

  var adcPins = [32, 33, 34, 35];
  var adcScale = 3.3;
  for (var pin of adcPins) {
    await esp32.sendText(`analogSetPinAttenuation ${pin} ADC_11db`);
  }

  stopFlag12 = false;
  while (!stopFlag12) {
    var s = await esp32.sendQueryText('analogRead4');
    var a = s.split(' ');
    var chs = parseInt(a[0]) / 2;
    var data = [];
    for (var i = 0; i < chs; i++) {
      var x = parseInt(a[2 + 2 * i]);
      var y = parseInt(a[1 + 2 * i]) * adcScale / 4096.0;
      data.push(y);
    }
    chart1.push(data);
    await sleep(0.03);
  }

  button1.enable();
};

button2.click = async function() {
  stopFlag12 = true;
};

spinner1.value = 0; await spinner1.change(0);
spinner2.value = 0; await spinner2.change(0);

}
