async function main() {

var button1 = new Button('点滅開始');
var button2 = new Button('点滅停止');
var label1 = new Label('(pin 2)');
var button3 = new Button('取得開始');
var button4 = new Button('取得停止');
var chart1 = new LineChart('ADC3 (pin 39)');

var body = new Body();
body.push([button1, button2, label1]);
body.push([button3, button4]);
body.push(chart1);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.13');

var stopFlag12;
button1.click = async function() {
  button1.disable();

  await esp32.sendText('pinMode 2 OUTPUT');

  stopFlag12 = false;
  while (!stopFlag12) {
    await esp32.sendText('digitalWrite 2 HIGH');
    await sleep(0.5);
    await esp32.sendText('digitalWrite 2 LOW');
    await sleep(0.5);
  }

  button1.enable();
};

button2.click = async function() {
  stopFlag12 = true;
};

var stopFlag34;
button3.click = async function() {
  button3.disable();

  var adcScale = 3.3;
  await esp32.sendText('analogSetPinAttenuation 39 ADC_11db');

  stopFlag34 = false;
  while (!stopFlag34) {
    var s = await esp32.sendQueryText('analogRead 39');
    var v = parseInt(s) * adcScale / 4096.0;
    chart1.push(v);
    await sleep(0.03);
  }

  button3.enable();
};

button4.click = async function() {
  stopFlag34 = true;
};

}
