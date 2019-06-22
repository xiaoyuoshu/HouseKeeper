function uint82str(array) {
    var out, i, len, c;
    var char2, char3;
    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
        c = array[i++];
    switch(c >> 4) {
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
        case 12: case 13:
            // 110x xxxx 10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
        case 14:
            // 1110 xxxx 10xx xxxx 10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
            ((char2 & 0x3F) << 6) |
            ((char3 & 0x3F) << 0));
            break;
        }
    }
    return out;
}

layui.use(['element','table','layer'], function(){
    var table = layui.table;
    var form = layui.form;

    //mqtt
    var userid = $('#userid').text()
    var client = mqtt.connect('wss://chuche.xyz:8084/mqtt',{
        username: "admin",
        password: "admin"
    })
    client.subscribe('newOpLog/'+userid, {qos: 2})
    client.subscribe('realTimeData2Web/'+userid, {qos: 2})

    //mqtt消息处理
    client.on('message', function (topic, payload) {
        if(topic.indexOf('realTimeData2Web') != -1){
            //实时数据
            var data = JSON.parse(uint82str(payload));
            $('#now #tem').text(data.tem);
            $('#now #hum').text(data.hum);
            $('#now #illumination').text(data.illumination);
            $('#now #smoke').text(data.smoke);
            $('#now #co2').text(data.co2);
        }
        if(topic.indexOf('newOpLog') != -1){
            //新操作日志
            console.log(uint82str(payload))
            $('#newop').show()
        }
        if(topic.indexOf('newWrLog') != -1){
            //新危险日志
            console.log('newwr')
            $('#newwr').show()
        }
    })

    //注销按钮
    $('#logout').click(function () {
        console.log('logout')
        $.ajax({
            url: '/api/logout',
            type: 'post',
            dataType: 'json',
            success: function (data) {
                if(data.success==1) window.location.href = '/login';
            }
        });
    })
    //操作日志
    $('#operating_log_btn').click(function () {
        $('#op_wr').text(1);
        $('#refresh_table').click();
    })
    //危险日志
    $('#warning_log_btn').click(function () {
        $('#op_wr').text(0);
        $('#refresh_table').click();
    })
    //刷新日志
    $('#refresh_table').click(function () {

        if ('1' === $('#op_wr').text()) {
            $('#newop').hide()
            table.render({
                elem: '#log_tbl'
                , height: 500
                , url: '/api/log/operating/' //数据接口
                , page: true //开启分页
                , cols: [[
                    {field: 'optime', title: '操作时间', width: 150}
                    , {field: 'optype', title: '操作类型', width: 150}
                    , {field: 'opremark', title: '备注'}
                ]]
                , done : function (res,curr,count) {
                    var all = $('[data-field=optime] div');
                    for(var t of all){
                        if(!('操作时间' === t.innerText)){
                            var begin_date = new Date(parseInt(t.innerText))
                            t.innerText = ((begin_date.getMonth()+1)
                                + "月"
                                +(begin_date.getDate()<10?('0'+begin_date.getDate()):(begin_date.getDate()))
                                +"日 "
                                +begin_date.getHours()
                                +':'
                                +(begin_date.getMinutes()<10?('0'+begin_date.getMinutes()):(begin_date.getMinutes()))
                                +':'
                                +(begin_date.getSeconds()<10?('0'+begin_date.getSeconds()):(begin_date.getSeconds()))
                            )
                        }
                    }
                }
            });
        } else {
            $('#newwr').hide()
            table.render({
                elem: '#log_tbl'
                , height: 500
                , url: '/api/log/warning/' //数据接口
                , page: true //开启分页
                , cols: [[
                    {field: 'wrtime', title: '发生时间', width: 150}
                    , {field: 'wrtype', title: '危险类型', width: 150}
                    , {field: 'wrremark', title: '备注'}
                ]]
                , done : function (res,curr,count) {
                    var all = $('[data-field=wrtime] div');
                    for(var t of all){
                        if(!('发生时间' === t.innerText)){
                            var begin_date = new Date(parseInt(t.innerText))
                            t.innerText = ((begin_date.getMonth()+1)
                                + "月"
                                +(begin_date.getDate()<10?('0'+begin_date.getDate()):(begin_date.getDate()))
                                +"日 "
                                +begin_date.getHours()
                                +':'
                                +(begin_date.getMinutes()<10?('0'+begin_date.getMinutes()):(begin_date.getMinutes()))
                                +':'
                                +(begin_date.getSeconds()<10?('0'+begin_date.getSeconds()):(begin_date.getSeconds()))
                            )
                        }
                    }
                }
            });
        }
    })
    $('#refresh_table').click();
    //控制空调
    form.on('submit(aircontrol)', function(data){
        var publishData = {
            userid: userid,
            tem: data.field.temperature,
            on: 'on' === data.field.airon?true:false
        };
        client.publish('controlAir/'+userid, JSON.stringify(publishData), {qos: 2})
        layer.msg('控制信息发送成功！', {
          icon: 1,
          time: 1000 //2秒关闭（如果不配置，默认是3秒）
        }, function(){
          //do something
        });
        return false;
    })
});

