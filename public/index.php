<?php
require '../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

function extract_yfm($text){
    $t = explode("\n", $text);
    $block = "";
    $started = false;
    foreach($t as $v){
        if(!$started and trim($v) == '---'){
            $started = true;
            continue;
        }
        if($started and trim($v) == '---'){
            break;
        }
        if($started){
            $block .= "\n".$v;
        }
    }
    return Yaml::parse(trim($block));
}

$data = [];
foreach(glob('howtos/*.md') as $pth){
    $t = file_get_contents($pth);
    try{
        $yfm = extract_yfm($t);
    }catch(\Exception $e){
        echo "Ошибка в $pth";
    }
    $data[] = [
        'title' => $yfm['title'],
        'pth' => $pth,
        'basename' => basename($pth, '.md'),
        'tags' => $yfm['tags'] ?? []
    ];
}


function name_for($pth){
    $t = file_get_contents($pth);
    $yfm = extract_yfm($t);
    return $yfm['title']. ' - '. basename($pth, '.md');
}

?>
<html>
    <head>
        <meta charset=utf8>
        <link rel="stylesheet" href="/css/bootstrap.min.css">
        <link rel="stylesheet" href="/style.css">
        <link rel="icon" href="/favicon.ico">
        <script>
            window.HOWTOS_DATA = <?=json_encode($data)?>;
        </script>
        <script src='/env.js'></script>
        <script src='/js/jquery.js'></script>
        <script src='/js/angular.min.js'></script>
        <script src='/script.js'></script>
    </head>
    <body>
        <div id="content" ng-app="todoApp" ng-controller="ListController">
            <br>
            <div class="row">
                <div class="span6">
                    <h1>Список рецептов</h1>
                </div>
                <div class="span6">
                    <input type="text" ng-model='search' placeholder="Поиск...">
                </div>
            </div>
            <ul>
                <li ng-repeat='(key, val) in data' ng-if="foundInSearch(val)">
                   <span ng-repeat='tag in val.tags'>
                      <span class="label" ng-click="setSearch('#'+tag)">{{tag}}</span>
                   </span>
                   <a href="/howto.html?pth={{val.pth}}">{{val.title}}</a>
                   <sup>{{val.basename}}</sup>
                </li>
            </ul>
        </div>
    </body>
</html>
