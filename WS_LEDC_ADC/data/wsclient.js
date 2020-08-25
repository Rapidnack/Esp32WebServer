/*
WebSocketサーバーに接続するクライアントモジュール

関数:
	sleep(): 指定した秒数後次の処理に進む。
	isNumber(): 数値のときはtrue、それ以外のときはfalseを返す。
	isString(): 文字列のときはtrue、それ以外のときはfalseを返す。

クラス:
	Client: WebSocketサーバーに接続するクライアントのクラス
	Body: Label/Textbox/Button等をHTMLに配置するクラス
	Label: ラベルのクラス
	Textbox: 文字入力／数値入力テキストボックスのクラス
	Button: ボタンのクラス
	Checkbox: チェックボックスのクラス
	Radio: ラジオボタンのクラス
	Slider: 数値入力スライダーのクラス
	Spinner: 数値入力スピナーのクラス
	LineChart: 折れ線グラフのクラス
*/


/*
指定した秒数後次の処理に進む。
*/
async function sleep(sec) {
	return new Promise(function(resolve) {
		setTimeout(resolve, Math.round(sec * 1000));
	});
}


/*
数値のときはtrue、それ以外のときはfalseを返す。
*/
function isNumber(obj) {
  return ((typeof obj === 'number') && (isFinite(obj)));
}


/*
文字列のときはtrue、それ以外のときはfalseを返す。
*/
function isString(obj) {
    return typeof (obj) == "string" || obj instanceof String;
}


/*
WebSocketサーバーに接続するクライアントのクラス
*/
class Client {

	constructor() {
		this._commandSocket = null;
		this._eventSocket = null;
		this._stopFlag = false;
		this._received = null;
	}

	/*
	コマンド用とイベント用の２つのTCPソケットをサーバーに接続する。

	接続後イベントを受信し続ける。

	Args:
		address (str): サーバーアドレス。
		commandport (int): コマンド用TCPソケットのポート番号。
		eventport (int): イベント用TCPソケットのポート番号。
	*/
	async connect(address='127.0.0.1', commandPort=54011, eventPort=54012) {
		this._address = address;
		this._commandPort = commandPort;
		this._eventPort = eventPort;

		// コマンド用とイベント用の２つのTCPソケットをサーバーに接続
		await this._openCommandSocket();
		await this._openEventSocket();

		// イベント受信を開始
		let self = this;
		this._eventSocket.onmessage = async function(event) {
			if (isString(event.data)) {
				self._sendEvent(event.data.split('\n'));
			} else {
				let reader = new FileReader();
				reader.onloadend = async function(e) {
					self._sendEvent(reader.result.split('\n'));
				};
				reader.readAsText(event.data);
			}
		};
	}

	/*
	サーバーとの接続を切る。
	*/
	disconnect() {
		this._closeEventSocket();
		this._closeCommandSocket();
	}

	/*
	クライアントを停止する。
	*/
	async stop() {
		this._stopFlag = true;
	}

	/*
	コマンド文字列をサーバーに送信する。

	Args:
		command (str): コマンド文字列。
		binary (bool): trueならバイナリモード。省略時はバイナリモード。
	*/
	async send(command, binary=true) {
		if (this._stopFlag)
			return;
		if (this._commandSocket == null) {
			throw new Error('接続されていません。');
		} else if (this._commandSocket.readyState != 1) {
			throw new Error('接続が切れました。');
		}

		try {
			if (binary) {
				this._commandSocket.send(new Blob([command], {type: 'text/plain'}));
			} else {
				this._commandSocket.send(command);
			}
		} catch (e) {
			throw new Error('送信に失敗しました。');
		}
	}

	/*
	テキストモードでコマンド文字列をサーバーに送信する。

	Args:
		command (str): コマンド文字列。
	*/
	async sendText(command) {
		await this.send(command, false);
	}

	/*
	コマンド文字列をサーバーに送信し、受信した応答文字列を返す。

	Args:
		command (str): コマンド文字列。
		binary (bool): trueならバイナリモード。省略時はバイナリモード。

	Returns:
		str: 受信した応答文字列。
	*/
	async sendQuery(command, binary=true) {
		if (this._stopFlag)
			return '0';
		if (this._commandSocket == null) {
			throw new Error('接続されていません。');
		} else if (this._commandSocket.readyState != 1) {
			throw new Error('接続が切れました。');
		}

		let r = await this._sendQuery(command, binary);
		if (r == null) {
			throw new Error('受信タイムアウト。');
		}
		return r;
	}

	/*
	テキストモードでコマンド文字列をサーバーに送信し、受信した応答文字列を返す。

	Args:
		command (str): コマンド文字列。

	Returns:
		str: 受信した応答文字列。
	*/
	async sendQueryText(command) {
		return await this.sendQuery(command, false);
	}

	async _sendQuery(command, binary=true) {
		let self = this;
		return new Promise(function(resolve) {
			self._commandSocket.onmessage = function(event) {
				if (isString(event.data)) {
					resolve(event.data.trimEnd());
				} else {
					let reader = new FileReader();
					reader.onloadend = async function(e) {
						resolve(reader.result.trimEnd());
					};
					reader.readAsText(event.data);
				}
			};
			try {
				if (binary) {
					self._commandSocket.send(new Blob([command], {type: 'text/plain'}));
				} else {
					self._commandSocket.send(command);
				}
			} catch (e) {
				throw new Error('送信に失敗しました。');
			}
			setTimeout(function() {
				resolve(null);
			}, 3000);
		});
	}

	_closeCommandSocket() {
		if (this._commandSocket != null) {
			this._commandSocket.close();
		}
	}

	_closeEventSocket() {
		if (this._eventSocket != null) {
			this._eventSocket.close();
		}
	}

	async _openCommandSocket() {
		let self = this;
		return new Promise(function(resolve, reject) {
			console.log(`connecting to ${self._address}:${self._commandPort}`);
			let s = `ws://${self._address}:${self._commandPort}/`;
			self._commandSocket = new WebSocket(s);
			let timer = setTimeout(function() {
				alert('接続タイムアウト。');
				reject('接続タイムアウト。');
			}, 3000);
			self._commandSocket.onopen = function(e) {
				clearTimeout(timer);
				console.log('command socket connected');
				resolve();
			};
		});
	}

	async _openEventSocket() {
		let self = this;
		return new Promise(function(resolve) {
			console.log(`connecting to ${self._address}:${self._eventPort}`);
			let s = `ws://${self._address}:${self._eventPort}/`;
			self._eventSocket = new WebSocket(s);
			let timer = setTimeout(function() {
				alert('接続タイムアウト。');
				reject('接続タイムアウト。');
			}, 3000);
			self._eventSocket.onopen = function(e) {
				clearTimeout(timer);
				console.log('event socket connected');
				resolve();
			};
		});
	}

	async _sendEvent(lines) {
		for (let line of lines) {
			if (this._stopFlag)
				break;

			line = line.trimEnd();
			if (line != '') {
				try {
					if (this._received != null) {
						await this._received(line);
					}
				} catch (e) {
					console.log(e.message);
				}
			}
		}
	}

	/*
	イベント受信時に実行されるユーザー定義関数を取得する。
	*/
	get received() {
		return this._received;
	}

	/*
	イベント受信時に実行されるユーザー定義関数を設定する。
	*/
	set received(received) {
		this._received = received;
	}
}


/*
Label/Textbox/Button等をHTMLに配置するクラス
*/
class Body {
	constructor() {
		this._itemId = 0;
		this._markup = '';
		this._items = [];
	}

	/*
	Label/Textbox/Button等をHTMLに配置して初期化する。
	*/
	show() {
		$('body').append(this._markup);
		for (var item of this._items) {
			item._init();
		}
	}

	/*
	show()でHTMLに配置するマークアップ文字列を準備する。

	纏めて配置したい項目はリストにして渡す。

	Args:
		items (object): Label/Textbox/Button等。
	*/
	push(items) {
		this._markup += '<p>';
		if (items instanceof Array) {
			for (var item of items) {
				this._push(item);
			}
		} else {
			this._push(items);
		}
		this._markup += '</p>';
	}

	_push(item) {
		this._markup += item._getMarkup(`_item${this._itemId++}`);
		this._items.push(item);
	}
}


/*
ラベルのクラス

optionsの代わりに文字列が渡された場合、ラベルに表示される。

Args:
	options (object):
		value (str): ラベルに表示される。
		label (str): ラベルの前に追加表示される。
		units (str): ラベルの後に追加表示される。
		width (str): '100px'等。
*/
class Label {
	constructor(options={}) {
		if (isString(options)) {
			this._options = {};
			this._value = options;
			this._label = '';
			this._units = '';
			this._width = '';
		} else {
			this._options = options;
			this._value = options.value || '';
			this._label = options.label || '';
			this._units = options.units || '';
			this._width = options.width || '';
		}
	}

	_getMarkup(id) {
		this._id = id;
		var s = '';
		if (this._label) {
			s += `<label for="${this._id}">${this._label}</label>`;
		}
		s += `<label id="${this._id}">${this._value}</label>`;
		if (this._units) {
			s += `<label for="${this._id}">${this._units}</label>`;
		}
		return s;
	}

	_init() {
		if (this._width) {
			$('#' + this._id).width(this._width);
		}
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}

	/*
	表示文字列label + value + unitsの内、valueを取得する。
	*/
	get value() {
		return $('#' + this._id).text();
	}

	/*
	表示文字列label + value + unitsの内、valueを設定する。
	*/
	set value(value) {
		$('#' + this._id).text(value);
	}
}


/*
文字入力／数値入力テキストボックスのクラス

optionsの代わりに文字列が渡された場合、テキストボックスの前に追加表示される。

Args:
	options (object):
		label (str): テキストボックスの前に追加表示される。
		units (str): テキストボックスの後に追加表示される。
		width (str): '100px'等。
		type (str): 'text'または'number'。省略時は'text'。
*/
class Textbox {
	constructor(options={}) {
		if (isString(options)) {
			this._options = {};
			this._label = options;
			this._units = '';
			this._width = '';
			this._type = 'text';
		} else {
			this._options = options;
			this._label = options.label || '';
			this._units = options.units || '';
			this._width = options.width || '';
			this._type = options.type || 'text';
		}
		this._change = null;
	}

	_getMarkup(id) {
		this._id = id;
		var s = '';
		if (this._label) {
			s += `<label for="${this._id}">${this._label}</label>`;
		}
		s += `<input type="${this._type}" id="${this._id}" />`;
		if (this._units) {
			s += `<label for="${this._id}">${this._units}</label>`;
		}
		return s;
	}

	_init() {
		if (this._width) {
			$('#' + this._id).width(this._width);
		}
		$('#' + this._id).addClass("ui-widget ui-widget-content ui-corner-all");

		var self = this;
		$('#' + this._id).bind('change', async function(event) {
			try {
				if (self._change != null) {
					if (self._type == 'number') {
						var value = parseFloat(self.value);
						if (isNumber(value)) {
							await self._change(value);
						}
					} else {
						await self._change(self.value);
					}
				}
			} catch (e) {
				alert(e.message);
				throw e;
			}
		});
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}

	/*
	テキストボックスの値を取得する。
	*/
	get value() {
		return $('#' + this._id).prop('value');
	}

	/*
	テキストボックスの値を設定する。ユーザー定義関数は呼ばない。
	*/
	set value(value) {
		$('#' + this._id).prop('value', value);
	}

	/*
	値が変化したとき実行されるユーザー定義関数を取得する。
	*/
	get change() {
		return this._change;
	}

	/*
	値が変化したとき実行されるユーザー定義関数を設定する。
	*/
	set change(change) {
		this._change = change;
	}
}


/*
ボタンのクラス

optionsの代わりに文字列が渡された場合、ボタンに表示される。

Args:
	options (object):
		label (str): ボタンに表示される。
*/
class Button {
	constructor(options={}) {
		if (isString(options)) {
			this._options = {};
			this._options.label = options;
		} else {
			this._options = options;
		}
		this._click = null;
	}

	_getMarkup(id) {
		this._id = id;
		return `<label id="${this._id}" />`;
	}

	_init() {
		$('#' + this._id).button(this._options);

		var self = this;
		$('#' + this._id).bind('click', async function(event) {
			try {
				if (self._click != null) {
					await self._click();
				}
			} catch (e) {
				alert(e.message);
				throw e;
			}
		});
	}

	/*
	ボタンを有効にする。
	*/
	enable() {
		$('#' + this._id).button('enable');
	}

	/*
	ボタンを無効にする。
	*/
	disable() {
		$('#' + this._id).button('disable');
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}

	/*
	クリックされたとき実行されるユーザー定義関数を取得する。
	*/
	get click() {
		return this._click;
	}

	/*
	クリックされたとき実行されるユーザー定義関数を設定する。
	*/
	set click(click) {
		this._click = click;
	}
}


/*
チェックボックスのクラス

optionsの代わりに文字列が渡された場合、チェックボックスに表示される。

Args:
	options (object):
		label (str): チェックボックスに表示される。
*/
class Checkbox {
	constructor(options={}) {
		if (isString(options)) {
			this._options = {};
			this._label = options;
		} else {
			this._options = options;
			this._label = options.label || '';
		}
		this._click = null;
	}

	_getMarkup(id) {
		this._id = id;
		var s = '';
		s += `<label for="${this._id}">${this._label}</label>`;
		s += `<input type="checkbox" id="${this._id}" />`;
		return s;
	}

	_init() {
		$('#' + this._id).checkboxradio(this._options);

		var self = this;
		$('#' + this._id).bind('click', async function(event) {
			try {
				if (self._click != null) {
					await self._click();
				}
			} catch (e) {
				alert(e.message);
				throw e;
			}
		});
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}

	/*
	ボタンの状態を取得する。
	*/
	get checked() {
		return $('#' + this._id + ':checked').val() == 'on';
	}

	/*
	ボタンの状態を設定する。
	*/
	set checked(checked) {
		$('#' + this._id).prop('checked', checked);
		$('#' + this._id).checkboxradio('refresh');
	}

	/*
	クリックされたとき実行されるユーザー定義関数を取得する。
	*/
	get click() {
		return this._click;
	}

	/*
	クリックされたとき実行されるユーザー定義関数を設定する。
	*/
	set click(click) {
		this._click = click;
	}
}


/*
ラジオボタンのクラス

optionsの代わりに文字列が渡された場合、ラジオボタンに表示される。

Args:
	options (object):
		label (str): ラジオボタンに表示される。
		name (str): ラジオボタンのグループ名。同じグループ名のボタンの内１つだけ選択される。
*/
class Radio {
	constructor(options={}) {
		if (isString(options)) {
			this._options = {};
			this._label = options;
			this._name = '';
		} else {
			this._options = options;
			this._label = options.label || '';
			this._name = options.name || '';
		}
		this._click = null;
	}

	_getMarkup(id) {
		this._id = id;
		var s = '';
		s += `<label for="${this._id}">${this._label}</label>`;
		s += `<input type="radio" name="${this._name}" id="${this._id}" />`;
		return s;
	}

	_init() {
		$('#' + this._id).checkboxradio(this._options);

		var self = this;
		$('#' + this._id).bind('click', async function(event) {
			try {
				if (self._click != null) {
					await self._click();
				}
			} catch (e) {
				alert(e.message);
				throw e;
			}
		});
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}

	/*
	ボタンの状態を取得する。
	*/
	get checked() {
		return $('#' + this._id + ':checked').val() == 'on';
	}

	/*
	ボタンの状態を設定する。
	*/
	set checked(checked) {
		$('#' + this._id).prop('checked', checked);
		$(`[name="${this._name}"]`).checkboxradio('refresh');
	}

	/*
	クリックされたとき実行されるユーザー定義関数を取得する。
	*/
	get click() {
		return this._click;
	}

	/*
	クリックされたとき実行されるユーザー定義関数を設定する。
	*/
	set click(click) {
		this._click = click;
	}
}


/*
数値入力スライダーのクラス

optionsの代わりに文字列が渡された場合、スライダーの上に追加表示される。

Args:
	options (object):
		label (str): スライダーの上に追加表示される。
		JQuery UIのスライダーのオプションも指定できます。
*/
class Slider {
	constructor(options={}) {
		if (isString(options)) {
			this._options = {};
			this._label = options;
		} else {
			this._options = options;
			this._label = options.label || '';
		}
		this._change = null;
	}

	_getMarkup(id) {
		this._id = id;
		var s = '';
		if (this._label) {
			s += `<label for="${this._id}">${this._label}</label>`;
		}
		s += `<div id="${this._id}" />`;
		return s;
	}

	_init() {
		$('#' + this._id).slider(this._options);

		var self = this;
		$('#' + this._id).bind('slide', async function(event, ui) {
			try {
				if (self._change != null) {
					await self._change(ui.value);
				}
			} catch (e) {
				alert(e.message);
				throw e;
			}
		});
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}

	/*
	スライダーの値を取得する。
	*/
	get value() {
		return $('#' + this._id).slider('value');
	}

	/*
	スライダーの値を設定する。ユーザー定義関数は呼ばない。
	*/
	set value(value) {
		$('#' + this._id).slider('value', value);
	}

	/*
	値が変化したとき実行されるユーザー定義関数を取得する。
	*/
	get change() {
		return this._change;
	}

	/*
	値が変化したとき実行されるユーザー定義関数を設定する。
	*/
	set change(change) {
		this._change = change;
	}
}


/*
数値入力スピナーのクラス

optionsの代わりに文字列が渡された場合、スピナーの前に追加表示される。

Args:
	options (object):
		label (str): スピナーの前に追加表示される。
		units (str): スピナーの後に追加表示される。
		width (str): '100px'等。
		JQuery UIのスピナーのオプションも指定できます。
*/
class Spinner {
	constructor(options={}) {
		if (isString(options)) {
			this._options = {};
			this._label = options;
			this._units = '';
			this._width = '';
		} else {
			this._options = options;
			this._label = options.label || '';
			this._units = options.units || '';
			this._width = options.width || '';
		}
		this._change = null;
	}

	_getMarkup(id) {
		this._id = id;
		var s = '';
		if (this._label) {
			s += `<label for="${this._id}">${this._label}</label>`;
		}
		s += `<input id="${this._id}" />`;
		if (this._units) {
			s += `<label for="${this._id}">${this._units}</label>`;
		}
		return s;
	}

	_init() {
		if (this._width) {
			$('#' + this._id).width(this._width);
		}
		$('#' + this._id).spinner(this._options);

		var self = this;
		$('#' + this._id).bind('spin', async function(event, ui) {
			try {
				if (self._change != null) {
					await self._change(ui.value);
				}
			} catch (e) {
				alert(e.message);
				throw e;
			}
		});
		$('#' + this._id).bind('change', async function(event, ui) {
			try {
				if (self._change != null) {
					var value = parseFloat(self.value);
					if (isNumber(value)) {
						await self._change(value);
					}
				}
			} catch (e) {
				alert(e.message);
				throw e;
			}
		});
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}

	/*
	スピナーの値を取得する。
	*/
	get value() {
		return $('#' + this._id).spinner('value');
	}

	/*
	スピナーの値を設定する。ユーザー定義関数は呼ばない。
	*/
	set value(value) {
		$('#' + this._id).spinner('value', value);
	}

	/*
	スピナーのステップを取得する。
	*/
	get step() {
		return $('#' + this._id).spinner('option', 'step');
	}

	/*
	スピナーのステップを設定する。
	*/
	set step(step) {
		$('#' + this._id).spinner('option', 'step', step);
	}

	/*
	値が変化したとき実行されるユーザー定義関数を取得する。
	*/
	get change() {
		return this._change;
	}

	/*
	値が変化したとき実行されるユーザー定義関数を設定する。
	*/
	set change(change) {
		this._change = change;
	}
}


/*
折れ線グラフのクラス

optionsの代わりに文字列が渡された場合、１トレースのグラフのラベルになる。
optionsの代わりに文字列のリストが渡された場合、複数トレースのグラフのラベルになる。

Args:
	options (object):
		label (str): トレースのラベルになる。
		height (str): '100px'等。
		rollPoints (int): push()でロール表示されるデータ数。
		scales (str/object): 'millisecond'の場合、X軸の単位がミリ秒になる。
		Chart.jsのオプションも指定できます。
*/
class LineChart {
	constructor(options={}) {
		if (isString(options) || Array.isArray(options)) {
			this._options = {};
			this._label = options;
			this._height = '400px';
			this._rollPoints = 100;
		} else {
			this._options = options;
			this._label = options.label || '';
			this._height = options.height || '400px';
			this._rollPoints = options.rollPoints || 100;
			if (options.scales == 'millisecond') {
				options.scales = {
					xAxes: [{
						type: 'time',
						time: {
							unit: 'millisecond',
							displayFormats: { 'millisecond': 'SSS[ ms]' }
						}
					}]
				}
			}
		}
		this._colors = [
			"rgba(78,154,6,0.8)",
			"rgba(200,141,0,0.8)",
			"rgba(204,0,0,0.8)",
			"rgba(32,74,135,0.8)",
			"rgba(255,0,0,0.8)", // Red
			"rgba(255,165,0,0.8)", // Orange
			"rgba(255,225,0,0.8)",
			"rgba(0,128,0,0.8)", // Green
			"rgba(0,0,255,0.8)", // Blue
			"rgba(75,0,130,0.8)", // Indigo
			"rgba(238,130,238,0.8)", // Violet
		];
	}

	_getMarkup(id) {
		this._id = id;
		return `<canvas id="${this._id}" height="${this._height}" />`;
	}

	_init() {
		var datasets = []
		if (isString(this._label)) {
			datasets.push({
				label: this._label,
				data: [],
				fill: false,
				borderColor : this._colors[0],
				backgroundColor : this._colors[0].replace('0.8)', '0.5)'),
			});
		} else if (Array.isArray(this._label)) {
			var i = 0;
			for (var label of this._label) {
				var c = i % this._colors.length;
				datasets.push({
					label: label,
					data: [],
					fill: false,
					borderColor : this._colors[c],
					backgroundColor : this._colors[c].replace(', 0.8)', ', 0.5)'),
				});
				i++;
			}
		}

		var graphData = {
			labels: [],
			datasets: datasets
		};
		var graphOptions = {
			maintainAspectRatio: false,
			elements: {
				line: {
					tension: 0 // ベジェ曲線を無効にする
				}
			}
		};
		this._chart = new Chart($('#' + this._id), {
			type: 'line',
			data: graphData,
			options: { ...graphOptions, ...this._options }
		});
	}

	/*
	グラフ全体のデータをセットする。

	X軸の値＋トレース分のY軸データのリストのリストを渡す。
	[[x0, y0A, y0B, ...], [x1, y1A, y1B, ...], [x2, y2A, y2B, ...], ...]
	*/
	setData(data) {
		this._chart.data.labels.splice(0);
		for (var i = 0; i < this._chart.data.datasets.length; i++) {
			this._chart.data.datasets[i].data.splice(0);
		}

		for (var datum of data) {
			this._chart.data.labels.push(datum[0]);
			for (var i = 0; i < this._chart.data.datasets.length; i++) {
				this._chart.data.datasets[i].data.push(datum[1 + i]);
			}
		}
		this._chart.update();
	}

	/*
	グラフに１サンプルのデータを追加する。

	X軸の値は現在時刻、トレース分のY軸データのリスト[yA, yB, yC, yD, ...]を渡す。
	*/
	push(values) {
		if (this._chart.data.labels.length > this._rollPoints) {
			this._chart.data.labels.shift();
		}
		for (var i = 0; i < this._chart.data.datasets.length; i++) {
			if (this._chart.data.datasets[i].data.length > this._rollPoints) {
				this._chart.data.datasets[i].data.shift();
			}
		}

		var t = new Date().toLocaleTimeString();
		this._chart.data.labels.push(t);
		if (values instanceof Array) {
			for (var i = 0; i < this._chart.data.datasets.length; i++) {
				this._chart.data.datasets[i].data.push(values[i]);
			}
		} else {
			this._chart.data.datasets[0].data.push(values);
		}
		this._chart.update();
	}

	/*
	グラフをクリアする。
	*/
	clear() {
		this._chart.data.labels.splice(0);
		for (var i = 0; i < this._chart.data.datasets.length; i++) {
			this._chart.data.datasets[i].data.splice(0);
		}
		this._chart.update();
	}

	/*
	ID文字列を取得する。
	*/
	get id() {
		return this._id;
	}
}
