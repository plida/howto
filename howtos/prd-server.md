---
title: Боевой сервер для php проекта с nodejs
tags:
  - php
variables:
  server_name:
    description: Адрес сервера где будет настройка производиться
    required: true
    example: server123.reg.ru
  repository_url:
    description: Адрес где репозиторий находится
    default: https://github.com/Bubujka/howto.git

  guest_main_user:
    description: Имя пользователя на сервере
    hidden: true
    default: prj
  PHP_VERSION:
    description: Версия php что нужна
    default: 8.1
  NODEJS_VERSION:
    description: Версия nodejs что нужна
    default: 16

---

# Предварительно
- [ ] Заполняем <var>server_name</var>
- [ ] Заполняем <var>repository_url</var>
- [ ] Проверяем что есть доступ к серверу

  ```
  ssh root@$server_name
  ```

# Основная настройка

- [ ] Заходим на сервер

  ```
  ssh root@$server_name
  ```

- [ ] Создаём пользователя

  ```
  adduser --disabled-password --gecos "" $guest_main_user
  rm /home/$guest_main_user/.bash_logout
  ```

- [ ] Устанавливаем nginx, php

  ```
  add-apt-repository -y ppa:ondrej/php
  apt install -y nginx php$PHP_VERSION-{fpm,cli,gd,curl,xml,pgsql,iconv,zip,mbstring,sqlite3} sqlite3
  ```

- [ ] Меняем пользователя

  ```
  sed -i 's/user = www-data/user = $guest_main_user/g' /etc/php/$PHP_VERSION/fpm/pool.d/www.conf
  service php8.1-fpm restart
  ```

- [ ] Устанавливаем composer

  ```
  EXPECTED_CHECKSUM="$(php -r 'copy("https://composer.github.io/installer.sig", "php://stdout");')"
  php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
  ACTUAL_CHECKSUM="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"

  if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]
  then
      >&2 echo 'ERROR: Invalid installer checksum'
      rm composer-setup.php
      exit 1
  fi

  php composer-setup.php --quiet
  rm composer-setup.php
  mv composer.phar /usr/local/bin/composer
  ```

- [ ] Делаем нормальный prompt

  ```
  cat > /etc/profile.d/ps.sh <<- "EOM"
  PROMPT_COMMAND=__prompt_command
  __prompt_command() {
      local EXIT="$?"
      local NAME="$(hostname)"
      local RCol='\[\e[0m\]'

      local Red='\[\e[0;31m\]'

      PS1="\n\[\033[32m\]\u @ \[\e[31;5m\]${NAME}\[\033[0;36m\] \w\[\033[33m\]\[\033[34m\]\n\n"

      if [ $EXIT != 0 ]; then
          PS1+="${Red}${EXIT} \$${RCol} "
      else
          PS1+="\$${RCol} "
      fi
  }
  EOM
  ```

- [ ] Затираем дефолтный конфиг nginx

  ```
  rm /etc/nginx/sites-enabled/default
  ```

- [ ] Создаём новый конфиг

  ```
  echo '

  server {
    listen 80;
    server_name _;

    index index.php;
    root /home/$guest_main_user/project/public;

    set $php_sock unix:/run/php/php$PHP_VERSION-fpm.sock;

    location / {
      try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
      include snippets/fastcgi-php.conf;
      fastcgi_pass    $php_sock;
    }
  }

  ' > /etc/nginx/sites-enabled/default
  ```

- [ ] Перезапускаем nginx

  ```
  service nginx reload
  ```


## Устанавливаем nodejs

- [ ] Заходим под пользователя на сервере

  ```
  su - $guest_main_user
  ```

- [ ] Устанавливаем nvm

  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
  ```

- [ ] Подключаем nvm

  ```
  . .nvm/nvm.sh
  ```

- [ ] Устанавливаем nodejs

  ```
  nvm install $NODEJS_VERSION
  ```

- [ ] Устанавливаем yarn

  ```
  npm i -g yarn pm2
  ```

# Настраиваем проект

- [ ] Клонируем проект

  ```
  git clone $repository_url ~/project
  ```

- [ ] Устанавливаем у него зависимости

  ```
  cd ~/project
  composer install
  yarn
  ```

- [ ] Создаём конфиг

  ```
  cd ~/project
  cp .env.example .env
  ./artisan key:generate
  ./artisan storage:link
  ```
- [ ] Пересобираем статику

  ```
  cd ~/project
  npm run build
  ```

- [ ] Проверяем как оно [работает](http://$server_name)
