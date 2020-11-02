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

#include <AD9833.h>

AD9833 ad9833(5);

void mySetup() {
  displayBuffer[2] = "WS_AD9833";
  updateDisplay();
}

void myLoop() {

}

String process(int8_t num, String str) {
  //Serial.printf("[%d]%s\n", num, str.c_str());

  if (str == "ad9833Begin") {
    ad9833.Begin();
  } else if (str.startsWith("ad9833ApplySignal ")) {
    str = str.substring(str.indexOf(' ') + 1);
    WaveformType p1;
    if (str.startsWith("SINE_WAVE")) {
      p1 = SINE_WAVE;
    } else if (str.startsWith("TRIANGLE_WAVE")) {
      p1 = TRIANGLE_WAVE;
    } else if (str.startsWith("SQUARE_WAVE")) {
      p1 = SQUARE_WAVE;
    } else if (str.startsWith("HALF_SQUARE_WAVE")) {
      p1 = HALF_SQUARE_WAVE;
    }
    str = str.substring(str.indexOf(' ') + 1);
    Registers p2;
    if (str.startsWith("REG0")) {
      p2 = REG0;
    } else if (str.startsWith("REG1")) {
      p2 = REG1;
    } else if (str.startsWith("SAME_AS_REG0")) {
      p2 = SAME_AS_REG0;
    }
    str = str.substring(str.indexOf(' ') + 1);
    float p3 = str.toFloat();
    if (str.indexOf(' ') < 0) {
      ad9833.ApplySignal(p1, p2, p3);
      return "";
    }
    str = str.substring(str.indexOf(' ') + 1);
    Registers p4;
    if (str.startsWith("REG0")) {
      p4 = REG0;
    } else if (str.startsWith("REG1")) {
      p4 = REG1;
    } else if (str.startsWith("SAME_AS_REG0")) {
      p4 = SAME_AS_REG0;
    }
    if (str.indexOf(' ') < 0) {
      ad9833.ApplySignal(p1, p2, p3, p4);
      return "";
    }
    str = str.substring(str.indexOf(' ') + 1);
    float p5 = str.toFloat();
    ad9833.ApplySignal(p1, p2, p3, p4, p5);
  } else if (str.startsWith("ad9833SetFrequency ")) {
    str = str.substring(str.indexOf(' ') + 1);
    Registers p1;
    if (str.startsWith("REG0")) {
      p1 = REG0;
    } else if (str.startsWith("REG1")) {
      p1 = REG1;
    } else if (str.startsWith("SAME_AS_REG0")) {
      p1 = SAME_AS_REG0;
    }
    str = str.substring(str.indexOf(' ') + 1);
    float p2 = str.toFloat();
    ad9833.SetFrequency(p1, p2);
  } else if (str.startsWith("ad9833EnableOutput ")) {
    str = str.substring(str.indexOf(' ') + 1);
    bool p1;
    if (str.startsWith("true")) {
      p1 = true;
    } else if (str.startsWith("false")) {
      p1 = false;
    }
    ad9833.EnableOutput(p1);
  } else if (str.startsWith("analogSetPinAttenuation ")) {
    str = str.substring(str.indexOf(' ') + 1);
    int pin = str.toInt();
    str = str.substring(str.indexOf(' ') + 1);
    if (str == "ADC_0db") {
      analogSetPinAttenuation(pin, ADC_0db);
    } else if (str == "ADC_2_5db") {
      analogSetPinAttenuation(pin, ADC_2_5db);
    } else if (str == "ADC_6db") {
      analogSetPinAttenuation(pin, ADC_6db);
    } else if (str == "ADC_11db") {
      analogSetPinAttenuation(pin, ADC_11db);
    }
  } else if (str.startsWith("analogFastRead ")) {
    str = str.substring(str.indexOf(' ') + 1);
    int p1 = str.toInt();
    str = str.substring(str.indexOf(' ') + 1);
    int p2 = str.toInt();

    int adcBuf[p2 * 2];
    int pos = 0;
    int n = 0;
    for (int i = 0; i < (p2 * 10) / 100; i++) { // 10% pre trigger
      adcBuf[pos * 2] = analogRead(p1);
      adcBuf[pos * 2 + 1] = micros();
      pos = (pos < p2 - 1) ? pos + 1 : 0;
    }
    while (n < p2 * 50) {
      int val = analogRead(p1);
      adcBuf[pos * 2] = val;
      adcBuf[pos * 2 + 1] = micros();
      pos = (pos < p2 - 1) ? pos + 1 : 0;
      n++;
      if (val < 0x800) break;
    }
    while (n < p2 * 50) {
      int val = analogRead(p1);
      adcBuf[pos * 2] = val;
      adcBuf[pos * 2 + 1] = micros();
      pos = (pos < p2 - 1) ? pos + 1 : 0;
      n++;
      if (val >= 0x800) break;
    }
    for (int i = 0; i < (p2 * 90) / 100; i++) { // 90% post trigger
      adcBuf[pos * 2] = analogRead(p1);
      adcBuf[pos * 2 + 1] = micros();
      pos = (pos < p2 - 1) ? pos + 1 : 0;
    }

    String s = String(p2 * 2);
    for (int i = 0; i < p2 * 2; i++) {
      s += " " + String(adcBuf[i]);
    }
    return s;
  }

  return "";
}
