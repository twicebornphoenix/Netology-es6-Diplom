'use strict';

'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    plus(obj) {
        if (!(obj instanceof Vector)) {
            throw new Error("Ожидается объект типа 'Vector'");
        }
        const newX = this.x + obj.x;
        const newY = this.y + obj.y;
        return new Vector(newX, newY);
    }
    times(number) {
        const newX = this.x * number;
        const newY = this.y * number;
        return new Vector(newX, newY);
    }
}


class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error("Ожидается объект типа 'Vector'");
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }

    act() {}
    get left() {
        return this.pos.x;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get top() {
        return this.pos.y;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
    get type() {
        return "actor";
    }
    isIntersect(obj) {
        if (!(obj instanceof Actor)) {
            throw new Error("Ожидается объект типа 'Actor'");
        }
        if (this === obj) {
            return false;
        }
        return this.right > obj.left && this.left < obj.right && this.top < obj.bottom && this.bottom > obj.top;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.height = this.grid.length;
        this.width = Math.max(0, ...this.grid.map(el => el.length));
        this.player = this.actors.find(el => el.type === "player");
        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }
    actorAt(actor) {
        return this.actors.find(el => actor.isIntersect(el));
    }
    obstacleAt(pos, size) {
        const left = Math.floor(pos.x);
        const right = Math.ceil(pos.x + size.x);
        const top = Math.floor(pos.y);
        const bottom = Math.ceil(pos.y + size.y);

        if (left < 0 || right > this.width || top < 0) {
            return "wall";
        }

        if (bottom > this.height) {
            return "lava";
        }

        for (let y = top; y < bottom; y++) {
            for (let x = left; x < right; x++) {
                const obstacle = this.grid[y][x];
                if (obstacle) {
                    return obstacle;
                }
            }
        }
    }
    removeActor(actor) {
        const index = this.actors.indexOf(actor);
        if (index !== -1) {
            this.actors.splice(index, 1);
        }
    }
    noMoreActors(type) {
        return !this.actors.some(el => el.type === type);
    }
    playerTouched(type, actor) {
        let obj = actor;
        if (type === "lava" || type === "fireball") {
            this.status = "lost";
        }
        if (type === "coin") {
            this.removeActor(obj);
            if (this.noMoreActors(type)) return this.status = "won";
        }
    }
}

class LevelParser {
    constructor(dict = {}) {
        this.dict = dict;
    }

    actorFromSymbol(symbol) {
        return this.dict[symbol];
    }
    obstacleFromSymbol(symbol) {
        switch (symbol) {
            case "x":
                return "wall";
            case "!":
                return "lava";
        }
    }
    createGrid(strArray) {
        return strArray.map(str => str.split('').map(symbol => this.obstacleFromSymbol(symbol)));
    }
    createActors(strArray) {
        const actorsArray = [];
        strArray.forEach((str, y) => {
            str.split("").forEach((ceil, x) => {
                const constr = this.actorFromSymbol(ceil);
                if (typeof constr === "function") {
                    const obj = new constr(new Vector(x, y));
                    if (obj instanceof Actor) {
                        actorsArray.push(obj);
                    }
                }
            });
        });
        return actorsArray;
    }
    parse(strArray) {
        return new Level(this.createGrid(strArray), this.createActors(strArray));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed);
    }

    get type() {
        return "fireball";
    }
    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }
    handleObstacle() {
        this.speed = this.speed.times(-1);
    }
    act(time, level) {
        if (level.obstacleAt(this.getNextPosition(time), this.size)) {
            this.handleObstacle();
        } else {
            this.pos = this.getNextPosition(time);
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 3));
        this.begin = pos;
    }
    handleObstacle() {
        this.pos = this.begin;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.begin = this.pos;
        this.spring = Math.random() * 2 * (Math.PI);
        this.springSpeed = 8;
        this.springDist = 0.07;
    }
    get type() {
        return "coin";
    }
    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }
    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist)
    }
    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.begin.plus(this.getSpringVector());
    }
    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
    }

    get type() {
        return "player";
    }
}

const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball
};

const parser = new LevelParser(actorDict);

loadLevels().then((levels) => {
    runGame(JSON.parse(levels), parser, DOMDisplay).then(() => alert("Поздравляем! Вы одержали победу!"))
});