import mysql.connector

'SQL module'


def conn():
    return mysql.connector.connect(user='jin', password='jin19980929', database='storehousekeeper')
    #return mysql.connector.connect(user='root', password='xiaoyuoshu', database='storehousekeeper')


def get_password(userid):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('select * from user WHERE userid = \'' + userid + '\'')
    values = cursor.fetchall()
    cursor.close()
    sqlconn.close()
    print(userid+' 登录')
    if len(values) is 1:
        query = {
            'password': values[0][1],
            'carid': values[0][2]
        }
    else:
        query = -1
    return query


def newData(data):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('insert into realTimeData (userid,datatime,tem,hum,illumination,smoke,co2) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                   (data['deviceID'], data['datatime'], data['tem'], data['hum'], data['illumination'], data['smoke'], data['co2']))
    sqlconn.commit()
    cursor.close()
    sqlconn.close()


def getData(userid, time):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('select datatime,tem,hum,illumination,smoke,co2 from realTimeData WHERE userid = %s and datatime > %s ORDER by datatime DESC ',
                   (userid, time))
    values = cursor.fetchall()
    cursor.close()
    sqlconn.close()
    return values


def getDatawxbyNumber(userid, c):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('select datatime,tem,hum,illumination,smoke,co2 from realTimeData WHERE userid = %s ORDER by datatime DESC limit '+c, (userid,))
    values = cursor.fetchall()
    cursor.close()
    sqlconn.close()
    return values


def getNowData(userid):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('select datatime,tem,hum,illumination,smoke,co2 from realTimeData WHERE userid = %s ORDER by datatime DESC limit 1',
                   (userid,))
    values = cursor.fetchall()
    cursor.close()
    sqlconn.close()
    return values


def newOP(userid, optime, optype, opremark):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('insert into operating_log (userid,optime,optype,opremark) VALUES (%s,%s,%s,%s)',
                   (userid, optime, optype, opremark))
    sqlconn.commit()
    cursor.close()
    sqlconn.close()


def newWR(userid, wrtime, wrtype, wrremark):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('insert into warning_log (userid,wrtime,wrtype,wrremark) VALUES (%s,%s,%s,%s)',
                   (userid, wrtime, wrtype, wrremark))
    sqlconn.commit()
    cursor.close()
    sqlconn.close()


def getOP(userid):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('select optime,optype,opremark from operating_log WHERE userid = \'' + userid + '\' order by optime desc')
    values = cursor.fetchall()
    cursor.close()
    sqlconn.close()
    return values


def getWR(userid):
    sqlconn = conn()
    cursor = sqlconn.cursor()
    cursor.execute('select wrtime,wrtype,wrremark from warning_log WHERE userid = \'' + userid + '\' order by wrtime desc')
    values = cursor.fetchall()
    cursor.close()
    sqlconn.close()
    return values

