async function main() {

var button1 = new Button('点滅開始');
var button2 = new Button('点滅停止');
var label1 = new Label('(pin 2)');

var body = new Body();
body.push([button1, button2, label1]);
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

}
