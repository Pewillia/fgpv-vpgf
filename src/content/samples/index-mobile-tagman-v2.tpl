<!DOCTYPE html>
<html lang="en">

<head>
<!-- added google tag manager - must be before container code pw aug 14-->		
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MMG4G75');
</script>
		
<!-- End Google Tag Manager -->	
    <meta charset="utf-8">
    <meta content="width=device-width,initial-scale=1" name="viewport">
    <title>title</title>

    <style>
        .myMap {
            height: 100%;
        }
    </style>

    <% for (var index in htmlWebpackPlugin.files.css) { %>
        <% if (webpackConfig.output.crossOriginLoading) { %>
            <link rel="stylesheet" href="<%= htmlWebpackPlugin.files.css[index] %>" integrity="<%= htmlWebpackPlugin.files.cssIntegrity[index] %>" crossorigin="<%= webpackConfig.output.crossOriginLoading %>"/>
        <% } else { %>
            <link rel="stylesheet" href="<%= htmlWebpackPlugin.files.css[index] %>" />
        <% } %>
    <% } %>
</head>

<!-- rv-service-endpoint="http://section917.cloudapp.net:8000/" rv-keys='["Airports"]' -->

<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MMG4G75"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

    <div class="myMap" id="mobile-map" is="rv-map"
        rv-config="configBCWildFires_18-07-17.json"
        rv-langs='["en-CA", "fr-CA"]'
        rv-wait="true"
        rv-restore-bookmark="bookmark">
         <noscript>
            <p>This interactive map requires JavaScript. To view this content please enable JavaScript in your browser or download a browser that supports it.<p>

            <p>Cette carte interactive nécessite JavaScript. Pour voir ce contenu, s'il vous plaît, activer JavaScript dans votre navigateur ou télécharger un navigateur qui le prend en charge.</p>
        </noscript>
    </div>

    <script>
        var needIePolyfills = [
            'Promise' in window,
            'TextDecoder' in window,
            'findIndex' in Array.prototype,
            'find' in Array.prototype,
            'from' in Array,
            'startsWith' in String.prototype,
            'endsWith' in String.prototype,
            'outerHTML' in SVGElement.prototype
        ].some(function(x) { return !x; });
        if (needIePolyfills) {
            // NOTE: this is the only correct way of injecting scripts into a page and have it execute before loading/executing any other scripts after this point (ie polyfills must be executed before the bootstrap)
            // more info on script loading: https://www.html5rocks.com/en/tutorials/speed/script-loading/
            document.write('<script src="../ie-polyfills.js"><\/script>');
        }
    </script>

    <% for (var index in htmlWebpackPlugin.files.js) { %>
        <% if (webpackConfig.output.crossOriginLoading) { %>
            <script src="<%= htmlWebpackPlugin.files.js[index] %>" integrity="<%= htmlWebpackPlugin.files.jsIntegrity[index] %>" crossorigin="<%= webpackConfig.output.crossOriginLoading %>"></script>
        <% } else { %>
            <script src="<%= htmlWebpackPlugin.files.js[index] %>"></script>
        <% } %>
    <% } %>

    <script>
        // https://css-tricks.com/snippets/javascript/get-url-variables/
        function getQueryVariable(variable)
        {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i=0;i<vars.length;i++) {
                    var pair = vars[i].split("=");
                    if(pair[0] == variable){return pair[1];}
            }
            return(false);
        }

        // plugins
        const baseUrl = window.location.href.split('?')[0] + '?keys={RV_LAYER_LIST}';
        RV.getMap('mobile-map').registerPlugin(RV.Plugins.BackToCart, 'backToCart', baseUrl);
        RV.getMap('mobile-map').registerPlugin(RV.Plugins.CoordInfo, 'coordInfo');

        function bookmark(){
            return new Promise(function (resolve) {
                var thing = getQueryVariable("rv");
                console.log(thing);
                resolve(thing);
            });
        }

        function queryStringToJSON(q) {
            var pairs = q.search.slice(1).split('&');
            var result = {};
            pairs.forEach(function(pair) {
                pair = pair.split('=');
                result[pair[0]] = decodeURIComponent(pair[1] || '');
            });
            return JSON.parse(JSON.stringify(result));
        }
        // grab & process the url
        var queryStr = queryStringToJSON(document.location);
        var keys = queryStr.keys;
        if (keys) {
            // turn keys into an array, pass them to the map
            var keysArr = keys.split(',');
            RV.getMap('mobile-map').restoreSession(keysArr);
        } else {
            var bookmark = queryStr.rv;
            // console.log(bookmark);
            RV.getMap('mobile-map').initialBookmark(bookmark);
        }
    </script>
</body>

</html>
