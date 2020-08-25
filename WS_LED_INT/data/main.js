async function main() {

var button1 = new Button('アタッチ');
var button2 = new Button('デタッチ');
var label1 = new Label('(pin 4)');
var button3 = new Button('点滅開始');
var button4 = new Button('点滅停止');
var label2 = new Label('(pin 2)');
var chart1 = new LineChart('割り込み (pin 4)');

var body = new Body();
body.push([button1, button2, label1]);
body.push([button3, button4, label2]);
body.push(chart1);
body.show();

var esp32 = new Client();
await esp32.connect(location.hostname || '192.168.10.13');

esp32.received = async function(s) {
  console.log(s);
  var a = s.split(' ');
  var v = parseInt(a[2]);
  chart1.push(v);
};

button1.click = async function() {
  button1.disable();

  await esp32.sendText('attachInterrupt 4 CHANGE');
};

button2.click = async function() {
  await esp32.sendText('detachInterrupt 4');

  button1.enable();
};

var stopFlag34;
button3.click = async function() {
  button3.disable();

  await esp32.sendText('pinMode 2 OUTPUT');
  stopFlag34 = false;
  while (!stopFlag34) {
    await esp32.sendText('digitalWrite 2 HIGH');
    await sleep(0.5);
    await esp32.sendText('digitalWrite 2 LOW');
    await sleep(0.5);
  }

  button3.enable();
};

button4.click = async function() {
  stopFlag34 = true;
};

}
