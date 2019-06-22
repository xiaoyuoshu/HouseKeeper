import hashlib
import mysql.connector
import time
from flask import Flask, render_template, request, session, redirect
import json
import paho.mqtt.client as mqtt
import connSQL

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
    return render_template('main.html', userid=session.get('account'))


# api
@app.route('/api/login/', methods=['POST'])
def login_form():
    # 接收登录表单，并创建session
    login_account = request.form['account']
    login_password = request.form['password']
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
    print(data)
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
        client.publish('newOpLog/whitenoise1', info)
        connSQL.newOP(control['userid'], int(time.time()*1000), '控制空调', info)


def on_publish(client, usedata, mid):
    pass


if __name__ == '__main__':
    # 监听所有ip，端口设置为5000
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_publish = on_publish
    client.username_pw_set('admin', 'admin')
    client.connect("chuche.xyz", 1883, 600)
    client.subscribe('realTimeData/#', 2)
    client.subscribe('controlAir/#', 2)
    client.loop_start()
    app.run("0.0.0.0", 10016)
