## JAK WPROWADZIĆ ZMIANY W PROJEKCIE

1. Zaakceptuj zaproszenie na githubie
2. Sklonuj projekt lokalnie (tylko raz!!!!!)
```
git clone https://github.com/simoneqq/web-game.git
cd web-game
npm install
```
3. Pobierz najnowsze zmiany
```
git pull
```
4. Stwórz branch do zadania
```
git checkout -b <nazwa zadania>
```
np. `git checkout -b fix-collisions`

5. Wprowadzenie zmian
```
// dodaj zmiany do zapisu
git add .
// zapisz zmiany
git commit -m "opis zmian"
```

6. Dodaj branch na GitHuba
``` 
git push origin <nazwa zadania>
``` 

7.  Stwórz pull requesta (PR)
    * Wejdź na GitHuba
    * Pojawi się przycisk Compare & pull request
    * Wyślij pull request

8. Czekaj aż ja zaakceptuje PR albo jak ci zależy to sam to zrób
9. Po zaakceptowaniu PR pobierz aktualizacje
```
git checkout main
git pull
```

jak chcesz rozpoczać nowe zadanie to znowu `git checkout -b <nazwa zadania>`