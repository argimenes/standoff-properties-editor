(function () {
    require.config({
        urlArgs: "v=1",
        baseUrl: "scripts",
        paths: {
            "app/utils": "app/app.utils.pkgd",            
            "speedy/editor": "app/modules/standoff-properties-editor",            
            "part/text-edit": "app/parts/text-edit",
            "bootstrap": "bootstrap.min",            
            "knockout": "knockout-3.4.2",
            "jquery": "jquery-3.1.1.min",                        
        },
        shim: {
            "app/utils": ["jquery", "knockout"],
            "bootstrap": ["jquery"]
        },
        waitSeconds: 0
    });
})();
