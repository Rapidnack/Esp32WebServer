async function main() {

var radio1 = new Radio({ label:'SINE', name:'radio1' });
var radio2 = new Radio({ label:'TRIANGLE', name:'radio1' });
var radio3 = new Radio({ label:'SQUARE', name:'radio1' });
var button1 = new Button('出力開始');
var button2 = new Button('出力停止');
var label1 = new Label('AD9833');
var button3 = new Button('取得開始');
var button4 = new Button('取得停止');
var chart1 = new LineChart({ label:'ADC3 (pin 39)', scales:'millisecond' });

var body = new Body();
body.push([radio1, radio2, radio3]);
body.push([button1, button2, label1]);
body.push([button3, button4]);
body.push(chart1);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.13');

var stopFlag12;
button1.click = async function() {
  button1.disable();

  var freq = 1000;
  var up = true;
  var type;
  if (radio1.checked) {
    type = 'SINE_WAVE';
  } else if (radio2.checked) {
    type = 'TRIANGLE_WAVE';
  } else if (radio3.checked) {
    type = 'SQUARE_WAVE';
  }
  await esp32.sendText(`ad9833ApplySignal ${type} REG0 ${freq}`);

  await esp32.sendText('ad9833EnableOutput true');

  stopFlag12 = false;
  while (!stopFlag12) {
    await esp32.sendText(`ad9833SetFrequency REG0 ${freq}`);
    if (up) {
      freq *= 1.1;
      if (freq > 10e3) {
        up = false;
      }
    } else {
      freq /= 1.1;
      if (freq < 1000) {
        up = true;
      }
    }
    await sleep(0.1);
  }

  await esp32.sendText('ad9833EnableOutput false');

  button1.enable();

  stopFlag12 = undefined;
};

button2.click = async function() {
  stopFlag12 = true;
};

async function radioClick() {
  if (stopFlag12 == false) {
    button2.click();
    while (stopFlag12 !== undefined) {
      await sleep(0.1);
    }
    button1.click();
  }
}

radio1.click = radioClick;
radio2.click = radioClick;
radio3.click = radioClick;

var stopFlag34;
button3.click = async function() {
  button3.disable();

  var adcScale = 1.1;
  await esp32.sendText('analogSetPinAttenuation 39 ADC_0db');

  stopFlag34 = false;
  while (!stopFlag34) {
    var s = await esp32.sendQueryText('analogFastRead 39 250');
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

  button3.enable();
};

button4.click = async function() {
  stopFlag34 = true;
};

await esp32.sendText('ad9833Begin');
radio1.checked = true;

}
