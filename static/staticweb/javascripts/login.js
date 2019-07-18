layui.use(['form','layer'], function(){
    var form = layui.form;
    var layer = layui.layer;
    form.on('submit(login_form)', function(data){
        console.log(data)
        $.ajax({
            url: '/api/login/',
            data: {
                account:data.field.account,
                password:CryptoJS.SHA1(data.field.password).toString()
            },
            type: 'post',
            dataType: 'json',
            success: function (data) {
                if(data.success==1) window.location.href = '/main/';
                else {
                    layer.open({
                        type: 1
                        ,offset: 'auto'
                        ,id: 'layerDemo'+'auto'
                        ,content: '<div style="padding: 50px 50px;">'+ '<P>登录失败！</p><p>请检查用户名和密码是否正确！</p>' +'</div>'
                        ,btn: '我知道了'
                        ,btnAlign: 'c'
                        ,shade: 0
                        ,yes: function(){
                            layer.closeAll();
                        }
                    });
                }
            }
        });
        return false;
    });
});