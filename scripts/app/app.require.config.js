(function () {
    require.config({
        urlArgs: "v=1",
        baseUrl: "scripts",
        paths: {
            "app/utils": "app/app.utils.pkgd",            
            "speedy/editor": "app/modules/standoff-properties-editor",            
            "speedy/monitor-bar":"app/modules/monitor-bar",
            "speedy/renderer": "app/modules/renderer",
            "speedy/arabic-nonspacing-data": "app/modules/arabic-shaping/arabic-nonspacing-data",
            "speedy/arabic-shaping-data": "app/modules/arabic-shaping/arabic-shaping-data",
            "speedy/arabic-shaping": "app/modules/arabic-shaping/arabic-shaping",
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
