# FreeCodeCamp - Quality Assurance with Chai Challenges
=======================================================

This is the repository for the freeCodeCamp [Quality Assurance with Chai Challenges](https://learn.freecodecamp.org/information-security-and-quality-assurance/quality-assurance-and-testing-with-chai/).   
The tests for the first to the 18th challenges (Unit Tests) reside in [1_unit-tests.js](tests/1_unit-tests.js).  
The tests for the first to the 18th challenges (Functional Tests) reside in [2_functional-tests.js](tests/1_unit-tests.js).  
Both are in the ```tests``` Folder and may be run locally - see [below](#running).

## Installation

If you haven't worked with **git** before, you might first want to read a few   
[resources](http://try.github.io/) about it, or go the [Glitch](https://glitch.com/) 
way as described on the above mentioned challenge introduction page.

To clone this Repository, go to a directory of your choice and enter:
```
git clone https://github.com/freeCodeCamp/boilerplate-mochachai.git
cd boilerplate-mochachai
```
But to be able to import it in Glitch or the coding platform of your choice,  
you have to [create your own Repository on GitHub](https://help.github.com/articles/creating-a-new-repository/).  
But before you are able to push to it, you have to remove the remote origin of
freeCodeCamp,   
rename the "gomix" branch to "master" and delete the gomix branch
to have a clutter free Repository:
```
git remote remove origin
git branch -m master
git branch -d gomix
```
Then follow the steps outlined in **...or push an existing repository from the command line**  
on the **Quick setup** screen, e.g.:
```
git remote add origin git@github.com:<yourname>/<your_repository>.git
git push -u origin master
```

Now you should have a fully functional Repository you can import to a coding platform.  
But to develop locally, there is one more step necessary, run:
```
npm install
```

## Running

Should you want to go through the challenges locally, run:
```
npm run start
```
This runs the tests and shows which tests pass and which don't (you might have 
to scroll up a little). The goal is to see: " 28 passing".  
Exit with ```CTRL(STRG/CMD)+C``` or just close the terminal window / command prompt.

## Conclusion

Don't forget to commit and push your changes after each challenge step, shouldn't 
you want to test locally (and, depending on your coding platform of choice, reimport it there),  
so freeCodeCamp is able to test your results!  

*Happy Coding!*