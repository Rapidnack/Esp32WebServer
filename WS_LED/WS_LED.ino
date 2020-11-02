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

void mySetup() {
  displayBuffer[2] = "WS_LED";
  updateDisplay();
}

void myLoop() {

}

String process(int8_t num, String str) {
  //Serial.printf("[%d]%s\n", num, str.c_str());

  if (str.startsWith("pinMode ")) {
    str = str.substring(str.indexOf(' ') + 1);
    int pin = str.toInt();
    str = str.substring(str.indexOf(' ') + 1);
    if (str == "INPUT") {
      pinMode(pin, INPUT);
    } else if (str == "OUTPUT") {
      pinMode(pin, OUTPUT);
    } else if (str == "INPUT_PULLUP") {
      pinMode(pin, INPUT_PULLUP);
    } else if (str == "INPUT_PULLDOWN") {
      pinMode(pin, INPUT_PULLDOWN);
    } else if (str == "OUTPUT_OPEN_DRAIN") {
      pinMode(pin, OUTPUT_OPEN_DRAIN);
    }
  } else if (str.startsWith("digitalWrite ")) {
    str = str.substring(str.indexOf(' ') + 1);
    int pin = str.toInt();
    str = str.substring(str.indexOf(' ') + 1);
    if (str == "LOW") {
      digitalWrite(pin, LOW);
    } else if (str == "HIGH") {
      digitalWrite(pin, HIGH);
    }
  }

  return "";
}
