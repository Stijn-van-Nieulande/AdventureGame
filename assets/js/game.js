// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 972;
canvas.height = 697;
document.body.appendChild(canvas);

/** DEBUG **/
var debuglevel_enabled = false;
var debuglevel = 1;
var debuggrid = false;
var cancelRun = false;
/** END DEBUG **/

var error;
var fps;
var backgroundImageID = 3;
var minimalFoodToComplete = 0;

var levelsJSON;
var loadJSON = function () {
	$.ajax({
		url: 'http://school.stijndevelopment.nl/game/assets/levels.json',
		dataType: 'json',
		async: true,
		success: function(data) {
			levelsJSON = data;
		}
	}).done(function() {
		console.info("Levels loaded.");
		//switchPage("level-1");
	}).fail(function() {
		error = "Can not load levels.";
		throw new Error("Can not load levels.");
	});
};
loadJSON();

var runLevelDebug = function () {
	if (debuglevel_enabled) {
		setInterval(function() {
			loadJSON();
			
			var data = levelsJSON[debuglevel];
			
			walls 					= data["walls"];
			keys 					= data["keys"];
			locks 					= data["locks"];
			minimalFoodToComplete 	= data["minimalFoodToComplete"];
			backgroundImageID 		= data["backgroundImageID"];
			finish 					= data["finish"];
			objectsToSpawn 			= data["objectsToSpawn"];
			maxObjects 				= data["maxObjects"];
		}, 1000);
	}
}

var activePage = "";

var levelExists = function (levelid) {
	if (levelsJSON.hasOwnProperty(levelid)) {
		return true;
	}
	return false;
};

var switchPage = function (page) {
	walls = [];
	objects = [];
	locks = [];
	keys = [];
	stopAllSounds();
	
	if (page == "intro") {
		var sound = getSound(1).sound;
		sound.play();
		sound.fade(0.0, 1.0, 1000);
	} else if (page == "outro") {
		var winSound = getSound(3).sound;
		winSound.on("end", getSound(1).sound.play());
		winSound.play();
	} else if (page.startsWith("level-")) {
		var levelid = page.replace("level-", "");
		
		if (levelExists(levelid)) {
			var data = levelsJSON[levelid];
			
			hero.x = canvas.width / 2;
			hero.y = canvas.height / 2;
			
			getSound(14).sound.play();
			var sound = getSound(data["backgroundSoundID"]).sound;
			sound.play();
			sound.fade(0.0, 1.0, 500);
			
			walls 					= data["walls"];
			keys 					= data["keys"];
			locks 					= data["locks"];
			minimalFoodToComplete 	= data["minimalFoodToComplete"];
			backgroundImageID 		= data["backgroundImageID"];
			finish 					= data["finish"];
			objectsToSpawn 			= data["objectsToSpawn"];
			maxObjects 				= data["maxObjects"];
		} else {
			console.error("level " + levelid + " don't exists!");
			switchPage("outro");
		}
	}
	
	console.info("switched page to: " + page);
	activePage = page;
};

var playingfootstep = false;
var playFootstep = function () {
	if (!playingfootstep) {
		playingfootstep = true;
		
		var stepNR = Math.floor((Math.random() * 3) + 1);
		switch (stepNR) {
			case 1:
				getSound(7).sound.play();
				return;
			case 2:
				getSound(8).sound.play();
				return;
			case 3:
				getSound(9).sound.play();
				return;
			default:
				getSound(7).sound.play();
				return;
		}
	}
}

var border = {
	width: 6,	// one border
	header_height: 51
};

// Game objects
/*
var hero = {
	speed: 256, // movement in pixels per second
	width: 32,
	height: 32
};
*/

var hero = {
	speed: 256,
	width: 32,
	height: 32,
	
	imageID: 32,
	imageXindex: 2,
	imageYindex: 0,
	
	sx: 0,
	sy: 0,
	sw: 32,
	sh: 32,
	x: 0,
	y: 0,
	dw: 32,
	dh: 32,
	movement: 0,
	movementReturn: false
};

var heroMovement = function (movement) {
	var m = hero.movement;
	if (hero.movementReturn) {
		m --;
		if (m <= 0) {
			hero.movementReturn = false;
		}
	} else {
		m ++;
		if (m >= 2) {
			hero.movementReturn = true;
		}
	}
	hero.movement = m;
	var indexX = (hero.imageXindex * (3 * 32));
	var indexY = (hero.imageYindex * (4 * 32));
	
	if (movement == "right") {
		hero.sy = indexY + 2 * 32;
	} else if (movement == "left") {
		hero.sy = indexY + 32;
	} else if (movement == "up") {
		hero.sy = indexY + 3 * 32;
	} else if (movement == "down") {
		hero.sy = indexY;
	}
	
	hero.sx = indexX + m * 32;
};

var monster = {
	width: 32,
	height: 32
};
var monsters = [];

var finish	= [];
var walls 	= []; // [x, y, imageid]
var locks 	= []; // [color, x, y, locked]
var keys 	= []; // [color, x, y, picked-up]
var objects = []; // [x, y, type]
var objectsToSpawn = []; // Type id's
var maxObjects = 0;
/**
	Object Type id's:
		- 0:	monster
		- 1:	clock
		- 2:	food (icecream)
		- 3:	food (icecream-2)
		- 4:	food (icecream-3)
		- 5:	food (donut)
		- 6:	food (taco)
		- 7:	food (burger)
*/

var gamebox = {
	width: canvas.width - border.width * 2,
	height: canvas.height - border.width - border.header_height,
	x: border.width,
	y: border.header_height
};

var foodbarRedOpacity = 0;
var foodbarRedSwitch = true;
var food = 100;
var time = 100;

var addFood = function (count) {
	if (food + count < 0) {
		food = 0;
	} else if (food + count > 100) {
		food = 100;
	} else {
		food += count;
	}
	
	if (food > 60) {
		hero.speed = 256;
	} else if (food > 40) {
		hero.speed = 256 - 20 * 1;
	} else if (food > 30) {
		hero.speed = 256 - 20 * 2;
	} else if (food > 20) {
		hero.speed = 256 - 20 * 3;
	} else if (food > 20) {
		hero.speed = 256 - 20 * 4;
	} else {
		hero.speed = 256 - 20 * 5;
	}
	
	if (food > minimalFoodToComplete) {
		foodbarRedOpacity = 0;
	}
}

var lose = false;
var addTime = function (count) {
	if (time + count < 0) {
		time = 0;
	} else if (time + count > 100) {
		time = 100;
	} else {
		time += count;
	}
	
	if (time <= 0) {
		if (!lose) {
			lose = true;
			stopAllSounds();
			var loseSound = getSound(2).sound;
			loseSound.on("end", getSound(1).sound.play());
			loseSound.play();
		}
	}
}

// Handle keyboard controls
var keysDown = {};

addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);

// Reset the game when the player catches a monster
var reset = function () {
	hero.x = canvas.width / 2;
	hero.y = canvas.height / 2;
	
	//var randomLocation = getRandomLocation();
	//monster.x = randomLocation[0];
	//monster.y = randomLocation[1];
	
	//monster.x = gamebox.x + 32 + (Math.random() * (gamebox.width - 64 - monster.width));
	//monster.y = gamebox.y + 32 + (Math.random() * (gamebox.height - 64 - monster.height));
};

var loadPercent = 0;
var countItemsToLoad = (39 + 17);
var addLoadPercent = function () {
	loadPercent += (100 / countItemsToLoad);
	console.info("loaded resources: " + Math.round(loadPercent) + "%");
	
	if (Math.round(loadPercent) >= 100) {
		switchPage("intro");
	}
};

var load = function () {
	loadImage(1,	"assets/img/backgrounds/border.png", 					addLoadPercent);	// border
	loadImage(2,	"assets/img/backgrounds/Game-grid.png", 				addLoadPercent);	// grid
	loadImage(3,	"assets/img/backgrounds/level-1.png", 					addLoadPercent);	// background level-1
	loadImage(4,	"assets/img/icons/characters/humen.png", 				addLoadPercent);	// human - 1
	loadImage(5,	"assets/img/icons/characters/monster.png", 				addLoadPercent);	// monster - 1
	loadImage(6,	"assets/img/icons/foliage.png", 						addLoadPercent);	// foliage
	loadImage(7,	"assets/img/logo.png", 									addLoadPercent);	// logo
	loadImage(8,	"assets/img/backgrounds/game-over.png", 				addLoadPercent);	// game-over
	loadImage(9,	"assets/img/icons/keys - locks/key-blue.png", 			addLoadPercent);	// key blue
	loadImage(10,	"assets/img/icons/keys - locks/key-green.png", 			addLoadPercent);	// key green
	loadImage(11,	"assets/img/icons/keys - locks/key-purple.png", 		addLoadPercent);	// key purple
	loadImage(12,	"assets/img/icons/keys - locks/key-red.png", 			addLoadPercent);	// key red
	loadImage(13,	"assets/img/icons/keys - locks/key-yellow.png", 		addLoadPercent);	// key yellow
	loadImage(14,	"assets/img/icons/keys - locks/lock-blue.png", 			addLoadPercent);	// lock blue
	loadImage(15,	"assets/img/icons/keys - locks/lock-green.png", 		addLoadPercent);	// lock green
	loadImage(16,	"assets/img/icons/keys - locks/lock-purple.png", 		addLoadPercent);	// lock purple
	loadImage(17,	"assets/img/icons/keys - locks/lock-red.png", 			addLoadPercent);	// lock red
	loadImage(18,	"assets/img/icons/keys - locks/lock-yellow.png", 		addLoadPercent);	// lock yellow
	loadImage(19,	"assets/img/icons/clock.png", 							addLoadPercent);	// clock
	loadImage(20,	"assets/img/backgrounds/main.png", 						addLoadPercent);	// main
	loadImage(21,	"assets/img/buttons/startgame.png", 					addLoadPercent);	// btn startgame
	loadImage(22,	"assets/img/buttons/startgame_red.png", 				addLoadPercent);	// btn startgame RED
	loadImage(23,	"assets/img/buttons/settings.png", 						addLoadPercent);	// btn settings
	loadImage(24,	"assets/img/buttons/settings_red.png", 					addLoadPercent);	// btn settings RED
	loadImage(25,	"assets/img/icons/characters/witch.png", 				addLoadPercent);	// witch
	loadImage(26,	"assets/img/icons/halloween.png", 						addLoadPercent);	// halloween pumpkin
	loadImage(27,	"assets/img/icons/cobweb.png", 							addLoadPercent);	// halloween cobweb
	loadImage(28,	"assets/img/backgrounds/bg-halloween.png", 				addLoadPercent);	// halloween background
	loadImage(29,	"assets/img/icons/characters/skeleton.png", 			addLoadPercent);	// skeleton
	loadImage(30,	"assets/img/icons/finish.png", 							addLoadPercent);	// finish
	loadImage(31,	"assets/img/controls.png", 								addLoadPercent);	// controls
	loadImage(32,	"assets/img/icons/characters/sprite-1.png", 			addLoadPercent);	// characters sprite 1
	loadImage(33,	"assets/img/icons/finish-line.png", 					addLoadPercent);	// finish line version
	loadImage(34,	"assets/img/icons/food/icecream.png", 					addLoadPercent);	// icecream
	loadImage(35,	"assets/img/icons/food/icecream-2.png", 				addLoadPercent);	// icecream-2
	loadImage(36,	"assets/img/icons/food/icecream-3.png", 				addLoadPercent);	// icecream-3
	loadImage(37,	"assets/img/icons/food/donut.png", 						addLoadPercent);	// donut
	loadImage(38,	"assets/img/icons/food/taco.png", 						addLoadPercent);	// taco
	loadImage(39,	"assets/img/icons/food/burger.png", 					addLoadPercent);	// burger

	loadSound(1,	["assets/sounds/intro.wav"], 				true, 		addLoadPercent);	// intro
	loadSound(2,	["assets/sounds/lose.wav"], 				false, 		addLoadPercent);	// lose
	loadSound(3,	["assets/sounds/win.wav"], 					false, 		addLoadPercent);	// win
	loadSound(4,	["assets/sounds/archievement.wav"], 		false, 		addLoadPercent);	// win
	loadSound(5,	["assets/sounds/monster.wav"], 				false, 		addLoadPercent);	// monster
	loadSound(6,	["assets/sounds/door-open.wav"], 			false, 		addLoadPercent); 	// door-open
	loadSound(7,	["assets/sounds/footstep_1.wav"], 			false, 		addLoadPercent); 	// footstep_1
	loadSound(8,	["assets/sounds/footstep_2.wav"], 			false, 		addLoadPercent); 	// footstep_2
	loadSound(9,	["assets/sounds/footstep_3.wav"], 			false, 		addLoadPercent); 	// footstep_3
	loadSound(10,	["assets/sounds/level-1.wav"], 				true, 		addLoadPercent); 	// level-1
	loadSound(11,	["assets/sounds/level-2.wav"], 				true, 		addLoadPercent); 	// level-2
	loadSound(12,	["assets/sounds/level-halloween.wav"], 		true, 		addLoadPercent); 	// level-halloween
	loadSound(13,	["assets/sounds/click.wav"], 				false, 		addLoadPercent); 	// button click
	loadSound(14,	["assets/sounds/flight_nextlevel.wav"], 	false, 		addLoadPercent); 	// switch next level
	loadSound(15,	["assets/sounds/star.ogg"], 				false, 		addLoadPercent); 	// star pickup
	loadSound(16,	["assets/sounds/eat.wav"], 					false, 		addLoadPercent); 	// eat
	loadSound(17,	["assets/sounds/clock.wav"], 				false, 		addLoadPercent); 	// clock
	loadSound(18,	["assets/sounds/christmas.wav"], 			true, 		addLoadPercent); 	// christmas intro
	
	getSound(7).sound.on("end", function() {playingfootstep = false});
	getSound(8).sound.on("end", function() {playingfootstep = false});
	getSound(9).sound.on("end", function() {playingfootstep = false});
	getSound(7).sound.on('play', 	function(){ getSound(7).sound.volume(0.5); });
	getSound(8).sound.on('play', 	function(){ getSound(8).sound.volume(0.5); });
	getSound(9).sound.on('play', 	function(){ getSound(9).sound.volume(0.5); });
	getSound(12).sound.on('play', 	function(){ getSound(12).sound.volume(0.5); });
	
	heroMovement("down");
}
	
var run = function () {
	if (cancelRun) {
		console.info("Run canceled!");
		return;
	}
	
	if (activePage.startsWith("level-")) {	
		var intervals = {};
		for (var i = 0; i < maxObjects; i++) {
			spawnObject();
		}
		/*
		for (var i = 0; i < 5; i++) {
			var rl = getRandomLocation();
			monsters[i] = [rl[0], rl[1]];
		}
		
		var intervival = setInterval(function() {
			var randomLocation = getRandomLocation();
			monster.x = randomLocation[0];
			monster.y = randomLocation[1];
			clearInterval(intervival);
		}, 3000);
		*/
		
		setInterval(function() {
			addTime(-0.1);
			addFood(-0.1);
		}, 80);
		setInterval(function() {
			if (foodbarRedSwitch) {
				foodbarRedOpacity += 0.1;
				if (foodbarRedOpacity >= 1) {
					foodbarRedSwitch = false;
				}
			} else {
				foodbarRedOpacity -= 0.1;
				if (foodbarRedOpacity <= 0) {
					foodbarRedSwitch = true;
				}
			}
		}, 100);
	}
};

var spawnObject = function () {
	var r = Math.floor(Math.random() * 20);
	var r2 = (r * 100) + (Math.floor((Math.random() * 200) + 100) * 100);
	var id = Math.floor(Math.random() * objectsToSpawn.length);
	
	var interval = setInterval(function() {
		var randomLocation = getRandomLocation();
		var push = [randomLocation[0], randomLocation[1], objectsToSpawn[id]];
		objects.push(push);
		clearInterval(interval);
		
		var interval2 = setInterval(function() {
			var index = objects.indexOf(push);
			if (index > -1) {
				console.log("TEST - 2");
				objects.splice(index, 1);
				console.log("TEST - 3");
			}
			
			spawnObject();
			clearInterval(interval2);
		}, r2);
	}, r * 100);
}

var getRandomLocation = function () {
	var rx = (gamebox.x + (Math.floor((Math.random() * (gamebox.width / 32 - 3)) + 1) * 32)),
		ry = (gamebox.y + (Math.floor((Math.random() * (gamebox.height / 32 - 3)) + 1) * 32));
	
	var j = 0;
	while (j < 1) {
		var found = false;
		for (var i = 0; i < walls.length; i++) {
			if (walls[i][0] == Math.floor(rx / 32) && walls[i][1] == Math.floor((ry - 32) / 32)) {
				found = true;
				break;
			}
		}
		for (var i = 0; i < objects.length; i++) {
			if (objects[i][0] == Math.floor(rx / 32) && objects[i][1] == Math.floor((ry - 32) / 32)) {
				found = true;
				break;
			}
		}
		for (var i = 0; i < locks.length; i++) {
			if (locks[i][1] == Math.floor(rx / 32) && locks[i][2] == Math.floor((ry - 32) / 32)) {
				found = true;
				break;
			}
		}
		for (var i = 0; i < keys.length; i++) {
			if (keys[i][1] == Math.floor(rx / 32) && keys[i][2] == Math.floor((ry - 32) / 32)) {
				found = true;
				break;
			}
		}
		if (finish[0] == Math.floor(rx / 32) && finish[1] == Math.floor((ry - 32) / 32)) {
			found = true;
		}
		
		if (found) {
			rx = (gamebox.x + 32 + (Math.floor((Math.random() * (gamebox.width / 32 - 3)) + 1) * 32)),
			ry = (gamebox.y + 32 + (Math.floor((Math.random() * (gamebox.height / 32 - 3)) + 1) * 32));
		} else {
			j = 1;
		}
	}
	
	return [rx, ry];
};

// Update game objects
var update = function (modifier) {
	if (38 in keysDown) { // Move Up
		if (hero.y - hero.speed * modifier > 32 + border.header_height) {
			if ((!isTouchingWall(modifier, "up")) && (!isTouchingLock(modifier, "up"))) {
				hero.y -= hero.speed * modifier;
				heroMovement("up");
				playFootstep();
			}
		}
	}
	if (40 in keysDown) { // Move Down
		if (hero.y + hero.speed * modifier < canvas.height - 32 - hero.height - border.width) {
			if ((!isTouchingWall(modifier, "down")) && (!isTouchingLock(modifier, "down"))) {
				hero.y += hero.speed * modifier;
				heroMovement("down");
				playFootstep();
			}
		}
	}
	if (37 in keysDown) { // Move Left
		if (hero.x - hero.speed * modifier > 32 + border.width) {
			if ((!isTouchingWall(modifier, "left")) && (!isTouchingLock(modifier, "left"))) {
				hero.x -= hero.speed * modifier;
				heroMovement("left");
				playFootstep();
			}
		}
	}
	if (39 in keysDown) { // Move Right
		if (hero.x + hero.speed * modifier < canvas.width - 32 - hero.width - border.width) {
			if ((!isTouchingWall(modifier, "right")) && (!isTouchingLock(modifier, "right"))) {
				hero.x += hero.speed * modifier;
				heroMovement("right");
				playFootstep();
			}
		}
	}

	// Touching object check
	/**
		Object Type id's:
			- 0:	monster				5
			- 1:	clock				19
			- 2:	food (icecream)		34	5
			- 3:	food (icecream-2)	35	6
			- 4:	food (icecream-3)	36	7
			- 5:	food (donut)		37	15
			- 6:	food (taco)			38	20
			- 7:	food (burger)		39	30
	*/
	for (var i = 0; i < objects.length; i++) {
		if (
			hero.x <= (objects[i][0] + 32)
			&& objects[i][0] <= (hero.x + 32)
			&& hero.y <= (objects[i][1] + 32)
			&& objects[i][1] <= (hero.y + 32)
		) {			
			if (objects[i][2] == 0) {
				console.log(i);
				objects.splice(i, 1);
				reset();
				addTime(-5);
				addFood(-5);
				getSound(5).sound.play();
			} else if (objects[i][2] == 1) {
				objects.splice(i, 1);
				addTime(10);
				getSound(17).sound.play();
			} else if (objects[i][2] == 2) {
				objects.splice(i, 1);
				addFood(5);
				getSound(16).sound.play();
			} else if (objects[i][2] == 3) {
				objects.splice(i, 1);
				addFood(6);
				getSound(16).sound.play();
			} else if (objects[i][2] == 4) {
				objects.splice(i, 1);
				addFood(7);
				getSound(16).sound.play();
			} else if (objects[i][2] == 5) {
				objects.splice(i, 1);
				addFood(15);
				getSound(16).sound.play();
			} else if (objects[i][2] == 6) {
				objects.splice(i, 1);
				addFood(20);
				getSound(16).sound.play();
			} else if (objects[i][2] == 7) {
				objects.splice(i, 1);
				addFood(30);
				getSound(16).sound.play();
			}
			break;
		}
	}
	/*for (var i = 0; i < monsters.length; i++) {
		if (
			hero.x <= (monsters[i][0] + 32)
			&& monsters[i][0] <= (hero.x + 32)
			&& hero.y <= (monsters[i][1] + 32)
			&& monsters[i][1] <= (hero.y + 32)
		) {
			var randomLocation = getRandomLocation();
			monsters[i][0] = randomLocation[0];
			monsters[i][1] = randomLocation[1];
		
			addFood(10);
			reset();
			getSound(5).sound.play();
			break;
		}
	}*/
	
	for (var i = 0; i < keys.length; i++) {
		var x = gamebox.x + keys[i][1] * 32;
		var y = gamebox.y + keys[i][2] * 32;
		if (
			hero.x <= (x + 32)
			&& x <= (hero.x + 32)
			&& hero.y <= (y + 32)
			&& y <= (hero.y + 32)
		) {
			if (keys[i][3] == false) {
				getSound(6).sound.play();
				keys[i][3] = true;
				for (var j = 0; j < locks.length; j++) {
					if (keys[i][0] == locks[j][0]) {
						locks[i][3] = false;
						break;
					}
				}
			}
			break;
		}
	}
	
	if (
		hero.x <= ((gamebox.x + finish[0] * 32) + 32)
		&& (gamebox.x + finish[0] * 32) <= (hero.x + 32)
		&& hero.y <= ((gamebox.y + finish[1] * 32) + 32)
		&& (gamebox.y + finish[1] * 32) <= (hero.y + 32)
		&& food >= minimalFoodToComplete
	) {		
		var nextlevel = parseInt(activePage.replace("level-", "")) + 1;
		switchPage("level-" + nextlevel);
	}
};

var isTouchingWall = function(modifier, movement) {
	var touching = false;
	for (var i = 0; i < walls.length; i++) {
		var h_x = hero.x + hero.speed * modifier;
		var h_y = hero.y + hero.speed * modifier;
		var padding = 5;
		var w_x = walls[i][0] * 32 + 4 + padding;
		var w_y = walls[i][1] * 32 + 32 + 16 + padding;
		
		if (movement == "right") {
			h_x = hero.x + hero.speed * modifier;
			h_y = hero.y;
		} else if (movement == "left") {
			h_x = hero.x - hero.speed * modifier;
			h_y = hero.y;
		} else if (movement == "up") {
			h_x = hero.x;
			h_y = hero.y - hero.speed * modifier;
		} else if (movement == "down") {
			h_x = hero.x;
			h_y = hero.y + hero.speed * modifier;
		}
		
		if (h_x < (w_x + 30 - padding) && (h_x + 30) > w_x &&
			h_y < (w_y + 30 - padding) && (h_y + 30) > w_y) {
			touching = true;
			break;
		}
	}
	return touching;
};

var isTouchingLock = function(modifier, movement) {
	var touching = false;
	for (var i = 0; i < locks.length; i++) {
		var h_x = hero.x + hero.speed * modifier;
		var h_y = hero.y + hero.speed * modifier;
		var padding = 5;
		var w_x = locks[i][1] * 32 + 4 + padding;
		var w_y = locks[i][2] * 32 + 32 + 16 + padding;
		
		if (movement == "right") {
			h_x = hero.x + hero.speed * modifier;
			h_y = hero.y;
		} else if (movement == "left") {
			h_x = hero.x - hero.speed * modifier;
			h_y = hero.y;
		} else if (movement == "up") {
			h_x = hero.x;
			h_y = hero.y - hero.speed * modifier;
		} else if (movement == "down") {
			h_x = hero.x;
			h_y = hero.y + hero.speed * modifier;
		}
		
		if (h_x < (w_x + 30 - padding) && (h_x + 30) > w_x &&
			h_y < (w_y + 30 - padding) && (h_y + 30) > w_y) {
				
			if (locks[i][3]) {
				touching = true;
			}
			break;
		}
	}
	return touching;
};

var mainBtn_startgame = {
	x: canvas.width / 2 - 150,
	y: canvas.height / 2 - 51 / 2 - 5,
	width: 300,
	height: 51,
	hovering: false
};
var mainBtn_settings = {
	x: canvas.width / 2 - 150,
	y: canvas.height / 2 + 51 / 2 + 5,
	width: 300,
	height: 51,
	hovering: false
};

// Check mouse click

function getMousePos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function isInside(pos, rect){
    return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y
}

canvas.addEventListener('click', function(e) {
	var mousePos = getMousePos(canvas, e);
	
	if (activePage == "intro") {
		if (isInside(mousePos, mainBtn_startgame)) {
			getSound(13).sound.play();
			switchPage("level-1");
			//switchPage("level-2");
			run();
		}
		if (isInside(mousePos, mainBtn_settings)) {
			console.log("clicked");
			getSound(13).sound.play();
		}
	}
}, false);

canvas.onmousemove = function(e) {
	var mousePos = getMousePos(canvas, e);
	
	if (isInside(mousePos, mainBtn_startgame)) {
		mainBtn_startgame.hovering = true;
	} else {
		mainBtn_startgame.hovering = false;
	}
	
	if (isInside(mousePos, mainBtn_settings)) {
		mainBtn_settings.hovering = true;
	} else {
		mainBtn_settings.hovering = false;
	}
};

var getFormattedDate = function () {
	var date = new Date();
	var str = date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds();
	
	return str;
}

// Draw everything
var render = function () {
	if (Math.round(loadPercent) < 100) {		
		var L_height = 20;
		var L_width = 200;
		var L_padding = 5;
		var L_pos_x = canvas.width / 2 - L_width / 2;
		var L_pos_y = canvas.height / 2 - L_height / 2;
		
		ctx.fillStyle = "#212121";
		ctx.fillRect(L_pos_x, L_pos_y, L_width + L_padding * 2, L_height);
		ctx.fillStyle = "#2b2b2b";
		ctx.fillRect(L_pos_x + L_padding, L_pos_y + L_padding, L_width, L_height - L_padding * 2);
		ctx.fillStyle = "#39d455";
		ctx.fillRect(L_pos_x + L_padding, L_pos_y + L_padding, Math.round(loadPercent) * 2, L_height - L_padding * 2);
		
		// Loading
		ctx.fillStyle = "#333333";
		ctx.font = "bold 20px Helvetica";
		ctx.textAlign = "center";
		ctx.textBaseline = "center";
		ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2 - 20);
		ctx.font = "bold 10px Helvetica";
		if (Math.round(loadPercent) <= 50) {
			ctx.fillStyle = "#FFFFFF";
		}
		ctx.fillText(Math.round(loadPercent) + "%", canvas.width / 2, canvas.height / 2 + 3);
		
		return;
	}
	
	if (getImage(1).ready) { // border
		ctx.drawImage(getImage(1).image, 0, 0);
	}
	
	if (activePage == "intro") {
		if (getImage(20).ready) {
			ctx.drawImage(getImage(20).image, border.width, border.header_height);
		}
		if (getImage(21).ready && getImage(22).ready) {
			if (mainBtn_startgame.hovering) {
				ctx.drawImage(getImage(22).image, mainBtn_startgame.x, mainBtn_startgame.y);
			} else {
				ctx.drawImage(getImage(21).image, mainBtn_startgame.x, mainBtn_startgame.y);
			}
		}
		if (getImage(23).ready && getImage(24).ready) {
			if (mainBtn_settings.hovering) {
				ctx.drawImage(getImage(24).image, mainBtn_settings.x, mainBtn_settings.y);
			} else {
				ctx.drawImage(getImage(23).image, mainBtn_settings.x, mainBtn_settings.y);
			}
		}
		if (getImage(31).ready) {
			var scaleSize = 200;
			ctx.drawImage(getImage(31).image, 380, 500, scaleSize, scaleSize * getImage(31).image.height / getImage(31).image.width);
		}
	} else {
		if (getImage(backgroundImageID).ready) {
			ctx.drawImage(getImage(backgroundImageID).image, border.width, border.header_height);
		}
		
		if (getImage(2).ready && debuggrid) { // grid
			ctx.drawImage(getImage(2).image, border.width, border.header_height);
		}
		
		if (getImage(30).ready && getImage(33).ready) { //finish
			if (food >= minimalFoodToComplete) {
				ctx.drawImage(getImage(30).image, gamebox.x + (finish[0] * 32), gamebox.y + (finish[1] * 32));
			} else {
				ctx.drawImage(getImage(33).image, gamebox.x + (finish[0] * 32), gamebox.y + (finish[1] * 32));
			}
		}

		if (getImage(4).ready) { //witch image 25
			ctx.drawImage(getImage(hero.imageID).image, hero.sx, hero.sy, hero.sw, hero.sh, hero.x, hero.y, hero.dw, hero.dh);
			//ctx.drawImage(getImage(4).image, hero.x, hero.y);
		}
		
		/*
		if (getImage(5).ready && getImage(29).ready) {
			for (var i = 0; i < monsters.length; i++) {
				if (activePage == "level-2") {
					ctx.drawImage(getImage(29).image, monsters[i][0], monsters[i][1]);
				} else {
					ctx.drawImage(getImage(5).image, monsters[i][0], monsters[i][1]);
				}
			}
		}
		*/
		for (var i = 0; i < objects.length; i++) {
			var imgID = 5;
			if (objects[i][2] == 0) {
				if (activePage == "level-2") {
					imgID = 29;
				} else {
					imgID = 5;
				}
			} else if (objects[i][2] == 1) {
				imgID = 19;
			} else if (objects[i][2] == 2) {
				imgID = 34;
			} else if (objects[i][2] == 3) {
				imgID = 35;
			} else if (objects[i][2] == 4) {
				imgID = 36;
			} else if (objects[i][2] == 5) {
				imgID = 37;
			} else if (objects[i][2] == 6) {
				imgID = 38;
			} else if (objects[i][2] == 7) {
				imgID = 39;
			}
			
			ctx.drawImage(getImage(imgID).image, objects[i][0], objects[i][1]);
		}
		
		for (var i = 0; i < walls.length; i++) {
			if (getImage(walls[i][2]).ready) {
				ctx.drawImage(getImage(walls[i][2]).image, border.width + (walls[i][0] * 32), border.header_height + (walls[i][1] * 32));
			}
		}
		
		for (var i = 0; i < locks.length; i++) {
			var colorImageId = 14;
			if (locks[i][0] == "blue") {
				colorImageId = 14;
			} else if (locks[i][0] == "green") {
				colorImageId = 15;
			} else if (locks[i][0] == "purple") {
				colorImageId = 16;
			} else if (locks[i][0] == "red") {
				colorImageId = 17;
			} else if (locks[i][0] == "yellow") {
				colorImageId = 18;
			}
			if (locks[i][3]) {
				ctx.drawImage(getImage(colorImageId).image, border.width + (locks[i][1] * 32), border.header_height + (locks[i][2] * 32));
			}
		}
		
		for (var i = 0; i < keys.length; i++) {
			var colorImageId = 9;
			if (keys[i][0] == "blue") {
				colorImageId = 9;
			} else if (keys[i][0] == "green") {
				colorImageId = 10;
			} else if (keys[i][0] == "purple") {
				colorImageId = 11;
			} else if (keys[i][0] == "red") {
				colorImageId = 12;
			} else if (keys[i][0] == "yellow") {
				colorImageId = 13;
			}
			if (!keys[i][3]) {
				ctx.drawImage(getImage(colorImageId).image, border.width + (keys[i][1] * 32), border.header_height + (keys[i][2] * 32));
			}
		}
		
		if (getImage(8).ready) {
			if (time <= 0) {
				ctx.drawImage(getImage(8).image, border.width, border.header_height);
			}
		}
		
		// Website // update time / fps
		ctx.fillStyle = "rgba(33, 33, 33, 0.8)";
		ctx.fillRect(gamebox.x, gamebox.y + gamebox.height - 12, gamebox.width, 12);
		
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "12px Helvetica";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText(getFormattedDate(), 8, canvas.height - 5);
		ctx.fillText(Math.round(fps) + " FPS", 158, canvas.height - 5);
		ctx.textAlign = "right";
		ctx.textBaseline = "bottom";
		ctx.fillText("StijnDevelopment.nl", canvas.width - 8, canvas.height - 5);
		
		// Food / Time
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 15px Helvetica";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("FOOD", 118, 5);
		ctx.fillText("TIME", canvas.width - 100 - 18, 5);
		
		// Food bar
		var height = 20;
		var width = 200;
		var padding = 5;
		var pos_x = 8;
		var pos_y = 23;
		ctx.fillStyle = "#212121";
		ctx.fillRect(pos_x, pos_y, width + padding * 2, height);
		if (food < minimalFoodToComplete) {
			ctx.fillStyle = "rgba(188, 49, 49, " + foodbarRedOpacity + ")";
			ctx.fillRect(pos_x, pos_y, width + padding * 2, height);
		}
		ctx.fillStyle = "#2b2b2b";
		ctx.fillRect(pos_x + padding, pos_y + padding, width, height - padding * 2);
		var color;
		if (food > 60) {
			color = "#42f44e"
		} else if (food > 40) {
			color = "#ebf442"
		} else if (food > 30) {
			color = "#f4a142"
		} else if (food > 20) {
			color = "#f45642"
		} else if (food > 20) {
			color = "#f44242"
		} else {
			color = "#c12626";
		}
		
		ctx.fillStyle = color;
		ctx.fillRect(pos_x + padding, pos_y + padding, food * 2, height - padding * 2);
		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect(pos_x + padding + minimalFoodToComplete * 2, pos_y + padding, 2, height - padding * 2);
		
		// Timer bar
		pos_x = canvas.width - width - padding * 2 - 8;
		
		ctx.fillStyle = "#212121";
		ctx.fillRect(pos_x, pos_y, width + padding * 2, height);
		ctx.fillStyle = "#2b2b2b";
		ctx.fillRect(pos_x + padding, pos_y + padding, width, height - padding * 2);
		ctx.fillStyle = "#4286f4";
		ctx.fillRect(pos_x + padding, pos_y + padding, time * 2, height - padding * 2);
	}
	
	if (getImage(7).ready) {
		var scaleSize = 200;
		ctx.drawImage(getImage(7).image, 380, 5, scaleSize, scaleSize * getImage(7).image.height / getImage(7).image.width);
	}
	
	if (error != null) {
		// Error
		ctx.fillStyle = "#c12626";
		ctx.font = "bold 20px Helvetica";
		ctx.textAlign = "center";
		ctx.textBaseline = "center";
		ctx.fillText("ERROR", canvas.width / 2, canvas.height / 2 - 20);
		
		// Error Message
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 15px Helvetica";
		ctx.textAlign = "center";
		ctx.textBaseline = "center";
		ctx.fillText(error, canvas.width / 2, canvas.height / 2 + 20);
	}
};

// The main game loop
var main = function () {
	var now = Date.now();
	var delta = now - then;

	update(delta / 1000);
	fps = 1 / (delta / 1000);
	render();

	then = now;

	// Request to do this again ASAP
	requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// Let's play this game!
var then = Date.now();
$(document).ready(function() {
	load();
	reset();
	main();
	runLevelDebug();
});