import hashlib
import mysql.connector
import time
from flask import Flask, render_template, request, session, redirect
import json
import paho.mqtt.client as mqtt
import connSQL
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

app = Flask(__name__)

# session加密
app.config["SECRET_KEY"] = "wo!@#$%hao!@#$%cai!@#$%a"


# 拦截登录
@app.before_request
def check_login():
    # 检查登录信息是否存在session内
    if 'static' in request.path:
        # 静态资源文件不重定向
        return None
    if 'api' in request.path:
        # api不重定向
        return None
    if 'logged_in' in session and session.get('logged_in'):
        # 已登录，拦截所有登录界面，直接跳转
        if request.path == '/login' or request.path == '/' or request.path == '/login/':
            return redirect('/main')
        else:
            return None
    else:
        # 未登录，强制跳转到登录界面
        if request.path == '/login' or request.path == '/' or request.path == '/login/':
            return None
        else:
            return redirect('/login')


# 页面路由
@app.route('/')
@app.route('/login/')
def login_route():
    # 登入界面
    return render_template('login.html')


@app.route('/main/')
def main_page():
    # 主界面
    return render_template('main.html',
                           userid=session.get('account'),
                           t_min=warn['t_min'],
                           t_max=warn['t_max'],
                           h_min=warn['h_min'],
                           h_max=warn['h_max'],
                           s_min=warn['s_min'],
                           s_max=warn['s_max'],
                           i_min=warn['i_min'],
                           i_max=warn['i_max'],
                           c_min=warn['c_min'],
                           c_max=warn['c_max'],
                           check=("checked" if(warn['waon'] == 'false') else ""))


# api for web
@app.route('/api/login/', methods=['POST'])
def login_form():
    # 接收登录表单，并创建session
    login_account = request.form['account']
    login_password = request.form['password']
    print(request.form['account'])
    print(request.form['password'])
    password = connSQL.get_password(login_account)
    if password is -1:
        return json.dumps({'success': 0})
    else:
        password = password['password']
    sha1 = hashlib.sha1()
    sha1.update(password.encode())
    if sha1.hexdigest() == login_password:
        # 账号密码匹配，创建session
        session['logged_in'] = True
        session['account'] = login_account
        return json.dumps({'success': 1})
    else:
        return json.dumps({'success': 0})


@app.route('/api/logout/',  methods=['POST'])
def logout():
    # 注销登录，清空session
    session.clear()
    return json.dumps({'success': 1})


@app.route('/api/warnset/', methods=['POST'])
def warn_set():
    if session.get('logged_in') is not True:
        return json.dumps({"error": 0})
    global warn
    warn['t_min'] = int(request.form['t_min'])
    warn['t_max'] = int(request.form['t_max'])
    warn['h_min'] = int(request.form['h_min'])
    warn['h_max'] = int(request.form['h_max'])
    warn['s_min'] = int(request.form['s_min'])
    warn['s_max'] = int(request.form['s_max'])
    warn['i_min'] = int(request.form['i_min'])
    warn['i_max'] = int(request.form['i_max'])
    warn['c_min'] = int(request.form['c_min'])
    warn['c_max'] = int(request.form['c_max'])
    warn['waon'] = False if(request.form['waon'] == 'false') else True
    print(warn)
    client.publish('newOpLog/'+session.get('account'), '')
    connSQL.newOP(session.get('account'), int(time.time() * 1000), '更改预警设置', '')
    return json.dumps({'success': 1})


@app.route('/api/log/operating/')
def operating_log():
    if session.get('logged_in') is not True:
        return json.dumps({"error": 0})
    query = connSQL.getOP(session.get('account'))
    data = []
    for d in query:
        data.append({
            'optime': d[0],
            'optype': d[1],
            'opremark': d[2]
        })
    for_return = {
      "code": 0,
      "msg": "",
      "count": len(data),
      "data": data
    }
    return json.dumps(for_return)


@app.route('/api/log/warning/')
def warning_log():
    if session.get('logged_in') is not True:
        return json.dumps({"error": 0})
    query = connSQL.getWR(session.get('account'))
    data = []
    for d in query:
        data.append({
            'wrtime': d[0],
            'wrtype': d[1],
            'wrremark': d[2]
        })
    for_return = {
        "code": 0,
        "msg": "",
        "count": len(data),
        "data": data
    }
    return json.dumps(for_return)


@app.route('/api/getData/')
def getData():
    if session.get('logged_in') is not True:
        return json.dumps({"error": 0})
    t = request.args.get('time')
    query = connSQL.getData(session.get('account'), t)
    data = []
    for d in query:
        data.append({
            'datatime': d[0],
            'tem': d[1],
            'hum': d[2],
            'illumination': d[3],
            'smoke': d[4],
            'co2': d[5]
        })
    return json.dumps(data)


@app.route('/api/getNowData/')
def getNowData():
    if session.get('logged_in') is not True:
        return json.dumps({"error": 0})
    query = connSQL.getNowData(session.get('account'))
    data = []
    for d in query:
        data.append({
            'datatime': d[0],
            'tem': d[1],
            'hum': d[2],
            'illumination': d[3],
            'smoke': d[4],
            'co2': d[5]
        })
    return json.dumps(data)


# api for wx
@app.route('/api/wxAirControl/',  methods=['POST'])
def wxAirControl():
    print(request.form)


@app.route('/api/getDatawx/')
def getDatawx():
    t = request.args.get('time')
    query = connSQL.getData(request.args.get('account'), t)
    data = []
    for d in query:
        data.append({
            'datatime': d[0],
            'tem': d[1],
            'hum': d[2],
            'illumination': d[3],
            'smoke': d[4],
            'co2': d[5]
        })
    return json.dumps(data)

@app.route('/api/getDatabyNumber/')
def getDatabyNumber():
    if session.get('logged_in') is not True:
        return json.dumps({"error": 0})
    c = request.args.get('count')
    query = connSQL.getDatawxbyNumber(session.get('account'), c)
    data = []
    for d in query:
        data.append({
            'datatime': d[0],
            'tem': d[1],
            'hum': d[2],
            'illumination': d[3],
            'smoke': d[4],
            'co2': d[5]
        })
    return json.dumps(data)


@app.route('/api/getDatawxbyNumber/')
def getDatawxbyNumber():
    c = request.args.get('count')
    query = connSQL.getDatawxbyNumber(request.args.get('account'), c)
    data = []
    for d in query:
        data.append({
            'datatime': d[0],
            'tem': d[1],
            'hum': d[2],
            'illumination': d[3],
            'smoke': d[4],
            'co2': d[5]
        })
    return json.dumps(data)


@app.route('/api/getNowDatawx/')
def getNowDatawx():
    query = connSQL.getNowData(request.args.get('account'))
    data = []
    for d in query:
        data.append({
            'datatime': d[0],
            'tem': d[1],
            'hum': d[2],
            'illumination': d[3],
            'smoke': d[4],
            'co2': d[5]
        })
    return json.dumps(data)


def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))


# 接收到mqtt消息的处理
def on_message(client, userdata, msg):
    t = time.time()
    topic = msg.topic.partition('/')
    title = topic[0]
    userid = topic[2]
    str = msg.payload.decode('utf-8')
    if title in "realTimeData":
        realTimeData = json.loads(str)
        realTimeData['datatime'] = int(t*1000)
        connSQL.newData(realTimeData)
        client.publish('realTimeData2Web/'+userid, json.dumps(realTimeData), qos=2)
    elif title in "controlAir":
        control = json.loads(str)
        print(control)
        if control['on']:
            info = '设置温度为' + control['tem'] + '度'
        else:
            info = '关闭空调'
        client.publish('newOpLog/'+control['userid'], info)
        connSQL.newOP(control['userid'], int(time.time()*1000), '控制空调', info)
    elif title in "carMode":
        carCon = json.loads(str)
        client.publish('newOpLog/'+carCon['userid'], '切换到'+carCon['carM'])
        connSQL.newOP(carCon['userid'], int(time.time()*1000), '切换小车运动模式', '切换到'+carCon['carM'])


def on_publish(client, usedata, mid):
    pass




# 监听所有ip，端口设置为5000
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.on_publish = on_publish
client.username_pw_set('admin', 'admin')
client.connect("chuche.xyz", 1883, 600)
client.subscribe('realTimeData/#', 2)
client.subscribe('controlAir/#', 2)
client.subscribe('carMode/#', 2)
client.loop_start()


global warn
warn = {
    't_min': 22,
    't_max': 27,
    'h_min': 66,
    'h_max': 78,
    's_min': 0,
    's_max': 900,
    'i_min': -1,
    'i_max': 15,
    'c_min': 102200,
    'c_max': 102250,
    'waon': False
}

if __name__ == '__main__':
    app.run("0.0.0.0", 10016)
