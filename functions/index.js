// P.S. await 的功能是為了要將所有數據收集到位，避免資料不足發生錯誤
//套件引入區
const functions = require('firebase-functions');
const {smarthome} = require('actions-on-google');
const admin = require('firebase-admin');
const fs = require('fs');

// 初始化oauth2.0 api
const {AuthenticationClient} = require('auth0');
const auth0 = new AuthenticationClient({
  'clientId': '2qFtQZpeNV5RSc1dLelz9FpVQF7QtIBs',
  'domain': 'networkgateway.us.auth0.com'
});

// 初始化firebase api
admin.initializeApp();

// 建立firebse Realtime 
const database = admin.database();

// 取用金鑰檔案
let jwt
try {
  jwt = require('./smart-home-key.json')
  //jwt = require('./assistant-bb11f-7ddcd017070c')
} catch (e) {
  //console.warn('Service account key is not found')
  //console.warn('Report state and Request sync will be unavailable')
}

var InitPackages = {} ;

// 修改回應碼封包
async function chPk(id,name)
{
	var Packages = '{\
	"requestId":' + id +',\
	"payload":{\
      "agentUserId": "12345678",\
      "devices": []\
		}\
	}';
	InitPackages = JSON.parse(Packages);
}

// 重組推送封包
async function addPackage(Packages,num,nickname)
{
	var newPackage ='{\
        "id": "' + nickname +'",\
        "type": "action.devices.types.SWITCH",\
        "traits": [\
          "action.devices.traits.OnOff"\
        ],\
        "name": {\
          "defaultNames": [],\
          "name": "' + nickname +'",\
          "nicknames": ["' + nickname +'"]\
        },\
        "willReportState": true,\
        "deviceInfo": {\
          "manufacturer": "AAA",\
          "model": "442",\
          "hwVersion": "3.2",\
          "swVersion": "11.4"\
        },\
        "customData": {\
          "fooValue": 10,\
          "barValue": true,\
          "bazValue": "switchabc"\
        }\
      }';
	 var OKPackage = JSON.parse(newPackage);
	 await InitPackages.payload.devices.push(OKPackage);
}

// 取得Firebase資料集(取得物件名字)
async function getFirebaseData(name)
{
	var Key ='' ;

	await database.ref('/' + name + '/device').once('value').then((data)=>{
		var keys = Object.keys(data.val());
		Key = keys;
	});  
	return (Key);
}

// 取得Firebase資料集(取得狀態)
async function getFirebaseValues(name)
{
	var Val = '' ;
	await database.ref('/' + name + '/device').once('value').then((data)=>{
		var Vals = Object.values(data.val());
		Val = Vals;
	});  
	return (Val);
}

// 處理封包加總
async function ProcessData(data,id , name)
{
	var len = data.length;
	chPk(id,name);
	for(i=0 ; i<len ; i++)
	{
		await addPackage(InitPackages,i,data[i]);
	}
	return InitPackages;
}

// 建立smarthome app
const app = smarthome({
  jwt: jwt,
  debug: false,
})

const app2 = smarthome({
  jwt: require('./service-account.json')
});

// 取用授權區
async function getUserID(headers)
{
  var data = headers.authorization;
  data = data.split('Bearer ')[1];
  const Profile = await auth0.getProfile(data); // Json格式檔
  var email  = Profile.email; // 取得email資料
  var User = email.split('@')[0]; // 解析email當User ID
  //console.log(User);
  return User;
}


  
// 語音助理推送函數區
app.onSync(async(body,headers) => {
	var name = await getUserID(headers);
	//console.log(JSON.stringify(body));
	//await app2.requestSync(name);
	app.requestSync(name).then((res) => {
    // Request sync was successful
  })
  .catch((res) => {
    // Request sync failed
  });
	return 	await ProcessData(await getFirebaseData(name),body.requestId,name);
});


var InitQueryPakage = {} ;
async function changeQueryPakage(id)
{
	var QueryPakage = '{\
    "requestId":'+ id +',\
    "agentUserId": "h57082287",\
	"payload": {\
      "devices": {}\
    }\
  }';

InitQueryPakage = JSON.parse(QueryPakage);
}

var addpackages ='{';
var j = 0 ;
async function addPackages(data,len , states)
{
	if(j === len-1)
	{
		addpackages = addpackages + '"'+ data + '":{"on": '+ states +',"online": true}}';
		//console.log("第"+ j + "次進入,完成後即將離開:" +addpackages);
		//console.log("目前InitQueryPakage的內容為:" + JSON.stringify(InitQueryPakage));
		var newPkg = JSON.parse(addpackages);
		InitQueryPakage.payload.devices = newPkg;
		j = 0 ;
		//console.log("準備離開:"+ JSON.stringify(InitQueryPakage));
	}
	else
	{
		addpackages = addpackages + '"'+ data + '":{"on": '+ states +',"online": true},';
		//console.log("j(data)= "+addpackages);
		//console.log("第"+ j + "次進入:" +addpackages);
		j++;
	}
}

async function setQueryPakage(data,id,states)
{
	//console.log("setQueryPakage函式被呼叫了");
	//console.log("資料被清除了");
	InitQueryPakage = {};
	addpackages = '{';
	changeQueryPakage(id);
	var len = data.length;
	for(k=0;k<len;k++)
	{
		//console.log("第" + k + "次for迴圈進入");
		await addPackages(data[k],len ,states[k]);
	}
	return InitQueryPakage;
}



// 今天處理以下部分 1. 設定firebase查詢用的資料 2.修改 onExecute裡的dervice 3. 換掉user
app.onQuery(async(body,headers) => {
	var name = await getUserID(headers);
	//console.log(body.inputs[0].payload.devices[0].customData);
	console.log(JSON.stringify(await setQueryPakage(await getFirebaseData(name),body.requestId , await getFirebaseValues(name))));
	
	
	// 針對HomeGraphics API Report 的回應
	var key = await getFirebaseData(name);
	var value = await getFirebaseValues(name);
	var buff = '{\
		"requestId":"' + body.requestId + '",\
        "agentUserId":"12345678",\
        "payload": {\
          "devices": {\
            "states": \
			{\
				\
			}\
          }\
        }}';
	var ReportState = {};
	ReportState = JSON.parse(buff);
	var pkg = '{' ;
	for(n = 0 ; n < key.length ; n++)
	{
		if(n === (key.length)-1)
		{
			pkg = pkg + '"'+ key[n] + '":{"on": '+ value[n] +'}}';
			var newPkg = JSON.parse(pkg);
			ReportState.payload.devices.states = newPkg;
		}
		else
		{
			pkg = pkg + '"'+ key[n] + '":{"on": '+ value[n] +'},';
		}
	}
	await app.reportState(ReportState);
	//---------------------------------------------------------------------  
	
	return await setQueryPakage(await getFirebaseData(name),body.requestId ,await getFirebaseValues(name));
});

/*
	
*/

async function ExecuteReponesPakage(id,ids , states)
{
	var pkg = '{\
    "requestId": ' + id + ',\
    "payload": {\
      "commands": [{\
        "ids": ["'+  ids +'"],\
        "status": "SUCCESS",\
        "states": {\
          "on": '+ states +',\
          "online": true\
        }\
      }]\
    }\
  }';
  
  return JSON.parse(pkg);
}  

app.onExecute(async(body,headers) => {
	var name = await getUserID(headers);
	var status = body.inputs[0].payload.commands[0].execution[0].params.on;
	var dervice = body.inputs[0].payload.commands[0].devices[0].id;
	var data = JSON.parse('{"' + dervice + '":' + status + '}');
	database.ref('/'+ name+'/resquire').set(data);
	database.ref('/'+ name+'/device').update(data);
	
	// 針對HomeGraphics API Report 的回應
	var key = await getFirebaseData(name);
	var value = await getFirebaseValues(name);
	var buff = '{\
		"requestId":"' + body.requestId + '",\
        "agentUserId":"12345678",\
        "payload": {\
          "devices": {\
            "states": \
			{\
				\
			}\
          }\
        }}';
	var ReportState = {};
	ReportState = JSON.parse(buff);
	var pkg = '{' ;
	for(n = 0 ; n < key.length ; n++)
	{
		if(n === (key.length)-1)
		{
			pkg = pkg + '"'+ key[n] + '":{"on": '+ value[n] +'}}';
			var newPkg = JSON.parse(pkg);
			ReportState.payload.devices.states = newPkg;
		}
		else
		{
			pkg = pkg + '"'+ key[n] + '":{"on": '+ value[n] +'},';
		}
	}
	await app.reportState(ReportState);
	//---------------------------------------------------------------------  
	
	return await ExecuteReponesPakage(body.requestId,dervice,status);
});


  
app.onDisconnect(async(body,headers) => {
	var name = await getUserID(headers);
	app.requestSync(name).then((res) => {
    // Request sync was successful
  })
  .catch((res) => {
    // Request sync failed
  });
	database.ref('/' + name).remove();
	return {};
});


// 給HomeGrapich API 使用
/*
	app.reportState().then((res) => {}).catch((res) => {});
	app.requestSync().then((res) => {}).catch((res) => {});
*/
exports.smarthome = functions.https.onRequest(app);