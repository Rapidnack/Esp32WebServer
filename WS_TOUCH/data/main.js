async function main() {

var button1 = new Button('アタッチ');
var button2 = new Button('デタッチ');
var label1 = new Label('(pin 12-15)');
var chart1 = new LineChart('タッチ割り込み (pin 12-15)');

var body = new Body();
body.push([button1, button2, label1]);
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

  await esp32.sendText('touchAttachInterrupt 12 30');
  await esp32.sendText('touchAttachInterrupt 13 30');
  await esp32.sendText('touchAttachInterrupt 14 30');
  await esp32.sendText('touchAttachInterrupt 15 30');
};

button2.click = async function() {
  await esp32.sendText('touchAttachInterrupt 12 0');
  await esp32.sendText('touchAttachInterrupt 13 0');
  await esp32.sendText('touchAttachInterrupt 14 0');
  await esp32.sendText('touchAttachInterrupt 15 0');

  button1.enable();
};

}
