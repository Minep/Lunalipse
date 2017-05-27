(function($) {
        var firstPush = true;
        var icons = $('.icon');
        var name = 'bus';
        icons.on('click', function(e){
            e.preventDefault();
            var oldName = name;
            name = $(this).data('name');
            var code = $(this).data('code');
            var category = $(this).parent().parent().find('.page-header').html();

            $('#icon-sizes i').removeClass('mtic-'+oldName).addClass('mtic-'+name);
            $('#iconmtdialog .source').html("mtic mtic-"+name);

            $('#icon-code .mtic').html('&#x'+code);
            $('#icon-code .unicode').html('Unicode: '+code);

            $('#icon-code .category').html('Category: '+category);
            $('#iconmtdialogLabel').html('Usage '+name);
            $('#iconmtdialog').attr("data-clipboard-text","mtic mtic-"+name);
        });
        $("#iconmtdialog").on(E_ON_MSDIALG_POS,function()
        {
            var cpb = new Clipboard(this);
            var c=$(this);
            cpb.on('success', function(e) {
                c.Toast("copied successful",T_TOASTSHORT);
                c.toggleDialogViewable();
            });
        })
        $("#iconmtdialog").on(E_ON_MSDIALG_NEG,function()
        {
            $(this).toggleDialogViewable();
        })
})(jQuery);
