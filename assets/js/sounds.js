var sounds = []; // contains: {id: ,sound:, src: ,ready: } >>>! Do not change the id of a sound !<<<

var loadSound = function (soundid, soundsrc, loop, onloadfunc = null) {
	var exists = false;
	var listid = sounds.length;
	for (var i = 0; i < sounds.length; i++) {
		if (sounds[i].id == soundid) {
			exists = true;
			listid = i;
			break;
		}
	}
	
	var rendersound = new Howl({
		src: soundsrc,
		loop: loop,
		preload: true
	});
	
	if (exists) {
		sounds[listid].sound = rendersound;
		sounds[listid].src = soundsrc;
	} else {
		var data = {id: soundid, sound: rendersound, src: soundsrc};
		sounds.push(data);
	}
	
	rendersound.on('load', function () {
		sounds[listid].ready = true;
		if (onloadfunc != null) {
			onloadfunc();
		}
	});
};

var getSound = function (soundid) {
	for (var i = 0; i < sounds.length; i++) {
		if (sounds[i].id == soundid) {
			return sounds[i];
		}
	}
};

var stopAllSounds = function () {
	for (var i = 0; i < sounds.length; i++) {
		sounds[i].sound.stop();
	}
}