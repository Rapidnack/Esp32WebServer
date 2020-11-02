#include <Wire.h>
#include "SSD1306Wire.h"
#include <WiFi.h>
#include <SPIFFS.h>
#include "ESPAsyncWebServer.h"
#include <WebSocketsServer.h>

const char* ssid = "--ssid--"; // 要変更
const char* password = "--password--"; // 要変更
const int socketPort = 54001;
const int socketPort2 = 54002;
const int webSocketPort = 54011;
const int webSocketPort2 = 54012;

void mySetup(); // このスケッチ固有のsetup()
void myLoop(); // このスケッチ固有のloop()
String process(int8_t num, String str); // 受信したメッセージを処理

SSD1306Wire display(0x3c, 21, 22);
String displayBuffer[4];
void updateDisplay() {
  display.clear();
  display.flipScreenVertically();
  display.setFont(ArialMT_Plain_16);
  for (int i = 0; i < 4; i++) {
    display.drawString(0, i * 16, displayBuffer[i]);
  }
  display.display();
}

WiFiServer server(socketPort);
WiFiServer server2(socketPort2);
WiFiClient client;
WiFiClient client2;

WebSocketsServer webSocket = WebSocketsServer(webSocketPort);
WebSocketsServer webSocket2 = WebSocketsServer(webSocketPort2);
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_TEXT:
      //Serial.printf("[%u] get Text: %s\n", num, payload);
      String inputString = (char*)payload;
      inputString.trim();
      String outputString = process(num, inputString);
      if (outputString != "") {
        webSocket.sendTXT(num, outputString.c_str());
      }
      break;
  }
}

void broadcastEventTXT(String str) {
  webSocket2.broadcastTXT(str.c_str());
  if (client2.connected()) {
    client2.println(str);
  }
}

const int webServerPort = 80;
AsyncWebServer webServer(webServerPort);

void setup() {
  Serial.begin(57600);
  display.init();

  // このスケッチ固有のsetup()を実行
  mySetup();

  // アクセスポイントに接続
  Serial.println("Connecting");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // TCPサーバーを起動
  server.begin();
  server2.begin();

  // WebSocketサーバーを起動
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  webSocket2.begin();

  // SPIFFSファイルシステムを使ってWebサーバーを起動
  String webServerStr = "";
  if(!SPIFFS.begin()){
    Serial.println("An Error has occurred while mounting SPIFFS");
    displayBuffer[2] = "SPIFFS failed!";
    updateDisplay();
  } else {
    webServer.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
      request->send(SPIFFS, "/index.html");
    });
    webServer.serveStatic("/favicon.ico", SPIFFS, "/favicon.ico");
    webServer.serveStatic("/jquery.ui.touch-punch.min.js", SPIFFS, "/jquery.ui.touch-punch.min.js");
    webServer.serveStatic("/Chart.bundle.min.js", SPIFFS, "/Chart.bundle.min.js");
    webServer.serveStatic("/wsclient.js", SPIFFS, "/wsclient.js");
    webServer.serveStatic("/main.js", SPIFFS, "/main.js");
    webServer.begin();
    webServerStr = " " + String(webServerPort);
  }

  Serial.println();
  Serial.println("Server started (" + WiFi.localIP().toString() + ")");
  Serial.println(String(socketPort) + " " + String(webSocketPort) + webServerStr);

  displayBuffer[0] = WiFi.localIP().toString();
  displayBuffer[1] = String(socketPort) + " " + String(webSocketPort) + webServerStr;
  updateDisplay();
}

void loop() {
  // このスケッチ固有のloop()を実行
  myLoop();

  webSocket.loop();
  webSocket2.loop();

  if (!client.connected()) {
    client = server.available();
  } else {
    if (client.available()) {
      String inputString = client.readStringUntil('\n');
      inputString.trim();
      String outputString = process(-1, inputString);
      if (outputString != "") {
        client.println(outputString);
      }
    }
  }
  if (!client2.connected()) {
    client2 = server2.available();
  }
}

// 以下、このスケッチ固有の記述

struct Interrupt {
  volatile unsigned int count = 0;
};
Interrupt interruptList[40];
void IRAM_ATTR touchIsr4() { ((Interrupt*)&interruptList[4])->count++; }
void IRAM_ATTR touchIsr12() { ((Interrupt*)&interruptList[12])->count++; }
void IRAM_ATTR touchIsr13() { ((Interrupt*)&interruptList[13])->count++; }
void IRAM_ATTR touchIsr14() { ((Interrupt*)&interruptList[14])->count++; }
void IRAM_ATTR touchIsr15() { ((Interrupt*)&interruptList[15])->count++; }
void IRAM_ATTR touchIsr27() { ((Interrupt*)&interruptList[27])->count++; }

void mySetup() {
  displayBuffer[2] = "WS_TOUCH";
  updateDisplay();
}

void myLoop() {
  for (int i = 0; i < 40; i++) {
    if (interruptList[i].count > 0) {
      interruptList[i].count = 0;
      String s = "Interrupt";
      s += " " + String(i);
      s += " " + String(digitalRead(i));
      broadcastEventTXT(s);
    }
  }
}

String process(int8_t num, String str) {
  //Serial.printf("[%d]%s\n", num, str.c_str());

  if (str.startsWith("touchAttachInterrupt ")) {
    str = str.substring(str.indexOf(' ') + 1);
    int pin = str.toInt();
    interruptList[pin].count = 0;
    str = str.substring(str.indexOf(' ') + 1);
    int threshold = str.toInt();
    switch (pin) {
    case 4: touchAttachInterrupt(pin, touchIsr4, threshold); break;
    case 12: touchAttachInterrupt(pin, touchIsr12, threshold); break;
    case 13: touchAttachInterrupt(pin, touchIsr13, threshold); break;
    case 14: touchAttachInterrupt(pin, touchIsr14, threshold); break;
    case 15: touchAttachInterrupt(pin, touchIsr15, threshold); break;
    case 27: touchAttachInterrupt(pin, touchIsr27, threshold); break;
    }
  }

  return "";
}
