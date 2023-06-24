const copyToClipboard = function(selector){
};


angular.module('todoApp', [])
  .controller('ListController', function($scope) {
    $scope.data = window.HOWTOS_DATA;
    $scope.search = window.location.hash.replace(/^\#/, '');
    $scope.setSearch = function(v){
      $scope.search = v;
    }
    $scope.$watch('search', (val) => {
      if(val){
        history.pushState(null, null, '#' + val);
      }else{
        window.location.hash = ''
      }
    });
    $scope.foundInSearch = function(val){
      if($scope.search == ''){
        return true;
      }
      if(val.basename.indexOf($scope.search) > -1){
        return true;
      }
      if(val.title.toLowerCase().indexOf($scope.search) > -1){
        return true;
      }
      if($scope.search.match(/^\#/)){
        if(val.tags.indexOf($scope.search.replace(/^\#/, '')) > -1){
          return true;
        }
      }
    }
    setTimeout(() => {
      $('input[type=text]:first').focus()
    });
  })
  .controller('TodoListController', function($scope, $sce) {
    var todoList = this;
    todoList.openLinkInNewPage = true;
    todoList.checkboxes = [];
    todoList.variables = {};
    todoList.content = '';
    todoList.editPrefix = '';

    todoList.haveVariables = function(){
      return Object.keys(todoList.variables).length > 0
    }
    function get_state_as_json(){
      var data = {}
      for(var i in todoList.variables){
        if(todoList.variables[i].value){
          data[i] = todoList.variables[i].value
        }
      }
      if(todoList.checkboxes.length){
        data.__checkboxes = todoList.checkboxes;
      }

      return JSON.stringify(data);
    }

    function restore_from_hash(){
      try{
        var data = JSON.parse(decodeURI(window.location.hash.replace(/^\#/, '')))
      }catch(e){
        console.log('ошибка при разборе. ну и пох');
        return
      }
      for(var i in data){
        if(i === '__checkboxes'){
          todoList.checkboxes = data[i]
          continue;
        }
        todoList.variables[i].value = data[i]
      }
    }

    function updateContentWithVariable(content){
      for(var i in todoList.variables){
        content = content.replace(new RegExp('\\$'+i, 'g'), todoList.variables[i].value)
      }
      return content;
    }

    function save_state_to_hash(){
      history.pushState(null, null, '#' + get_state_as_json());
    }

    todoList.showHidden = false
    todoList.toggleHidden = function(){
      todoList.showHidden = !todoList.showHidden
    }
    todoList.needToShow = function(variable){
      if(!variable.hidden){
        return true;
      }
      if(todoList.showHidden){
        return true;
      }
      return false;
    }
    todoList.replaceAndUpdate = function(){
      var content = updateContentWithVariable(todoList.content)
      save_state_to_hash();
      todoList.updateContent(content);
    }
    todoList.resetCheckboxes = function(){
      todoList.checkboxes = []
      save_state_to_hash()
      $('#content input').removeAttr('checked')
      calculate_progress()
    }

    function checkboxes_count(){
      return $('#content input').length
    }
    function checked_count(){
      return $('#content input:checked').length
    }
    function calculate_progress(){
        var count = checked_count() / checkboxes_count();
      if(checkboxes_count() > 0){
        $('#progress').html('Завершено: <b>' + (Math.floor(count * 100)) + '%</b>');
      }
    }

    function restore_checkbox_state(){
      if(todoList.checkboxes.length){
        for(var i in todoList.checkboxes){
          if(todoList.checkboxes[i]){
            $('#content input:eq('+i+')').attr('checked', true)
          }
        }
      }
    }

    function save_checkbox_state(){
      var boxes = [];
      $('#content input').each(function(){
        if($(this).is(':checked')){
          boxes.push(1);
        }else{
          boxes.push(0);
        }
      });
      todoList.checkboxes = boxes;
      $scope.$apply();
      save_state_to_hash();
    }

    todoList.valueRequiredAndEmpty = function(key, value){
      if(!value.required){
        return false;
      }
      if(!todoList.variables[key].value){
        return true;
      }
      return false;
    }
    todoList.haveHiddenVariables = function(){
      for(var i in todoList.variables){
        if(todoList.variables[i].hidden){
          return true;
        }
      }
    }
    todoList.updateContent = function(content) {
      document.getElementById('content').innerHTML = marked.parse(content);
      $('#content input[disabled]').removeAttr('disabled')
      restore_checkbox_state();
      calculate_progress();

      $('#content input').click(function(){
        save_checkbox_state();
        calculate_progress();
      });

      if(todoList.openLinkInNewPage){
        $('#content a').attr('target', '_blank')
      }

      $('#content var').click(function(){
        todoList.scrollPosition = window.scrollY;
        $('[data-key='+$(this).text()+']').focus();
      });

      $('#content code, #content pre').click(function(){
        const el = document.createElement('textarea');
        el.value = this.textContent;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        $.notify("Скопировано: \n"+this.textContent, 'success');
      });
    }

    todoList.restoreScrollPosition = function(){
      if(todoList.scrollPosition){
        window.scroll(0, todoList.scrollPosition);
      }
      todoList.scrollPosition = false;
    }

    var data = Qs.parse(window.location.search.replace('?', ''));

    todoList.pth = data.pth;

    $(function(){
      $('#topline').geopattern(data.pth)
    })
    if(window.ENV){
      todoList.editPrefix = $sce.trustAsUrl(window.ENV['EDIT_PREFIX']+todoList.pth);
      Mousetrap.bind('ctrl+shift+k', function(e) {
        window.open(todoList.editPrefix);
      });
      Mousetrap.bind('ctrl+shift+c', function(e) {
        var name = prompt("Название нового файла");
        if(name){
          window.open(window.ENV['EDIT_PREFIX']+'howtos/'+name+'.md');
        }
      });
    }

    function inc_stats(pth){
      if(!window.localStorage.hb_stats){
        window.localStorage.setItem('hb_stats', '{}');
      }
      var stats;
      try{
        stats = JSON.parse(window.localStorage.hb_stats);
      }catch(e){
        window.localStorage.setItem('hb_stats', '{}');
        stats = {};
      }
      if(stats[pth]){
        stats[pth]++;
      }else{
        stats[pth] = 1;
      }

      window.localStorage.setItem('hb_stats', JSON.stringify(stats));
    }

    inc_stats(todoList.pth);

    $.get('/topmenu.html?q='+(new Date() *1)).then(function(res){
      $('#topmenu').html(res);
    });
    $.get('/'+data.pth+'?q='+(new Date() *1)).then(function(res){
      var data = yamlFront.loadFront(res);
      todoList.content = data.__content;
      if(data.variables){
        todoList.variables = data.variables;
      }
      if(data.redirect){
        setTimeout(() => {
          window.location  = data.redirect;
        });
      }
      if(typeof data.blank != 'undefined' && !data.blank){
        todoList.openLinkInNewPage = false
      }
      todoList.title = data.title;
      for(var i in todoList.variables){
        if(todoList.variables[i].default){
          todoList.variables[i].value = todoList.variables[i].default ;
        }
      }
      restore_from_hash();
      todoList.updateContent(updateContentWithVariable(data.__content));
      $scope.$apply();
      setTimeout(() => {
        //$('input[type=text]:first').focus()
      });
    });
  });
