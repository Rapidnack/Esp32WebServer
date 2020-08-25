async function main() {

var button1 = new Button('取得開始');
var button2 = new Button('取得停止');
var chart1 = new LineChart(['ADXL345 X', 'ADXL345 Y', 'ADXL345 Z']);

var body = new Body();
body.push([button1, button2]);
body.push(chart1);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.13');

var stopFlag12;
button1.click = async function() {
  button1.disable();

  var s = await esp32.sendQueryText('adxl345Begin');
  if (s == '0') {
    alert('ADXL345が見つかりません。');
    button1.enable();
    return;
  }
  await esp32.sendText('adxl345SetRange ADXL345_RANGE_16_G');

  stopFlag12 = false;
  while (!stopFlag12) {
    var s = await esp32.sendQueryText('adxl345GetEvent');
    var a = s.split(' ');
    var x = parseFloat(a[0]);
    var y = parseFloat(a[1]);
    var z = parseFloat(a[2]);
    chart1.push([x, y, z]);
    await sleep(0.03);
  }

  button1.enable();
};

button2.click = async function() {
  stopFlag12 = true;
};

}
