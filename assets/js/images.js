var images = []; // contains: {id: ,image: ,src: ,ready: } >>>! Do not change the id of a image !<<<

var loadImage = function (imageid, imagesrc, onloadfunc = null) {
	var exists = false;
	var listid = images.length;
	for (var i = 0; i < images.length; i++) {
		if (images[i].id == imageid) {
			exists = true;
			listid = i;
			break;
		}
	}
	
	var renderimage = new Image();
	renderimage.src = imagesrc;
	
	if (exists) {
		images[listid].image = renderimage;
		images[listid].src = imagesrc;
		images[listid].ready = false;
	} else {
		var data = {id: imageid, image: renderimage, src: imagesrc, ready: false};
		images.push(data);
	}
	
	renderimage.onload = function () {
		images[listid].ready = true;
		if (onloadfunc != null) {
			onloadfunc();
		}
	};
};

var getImage = function (imageid) {
	for (var i = 0; i < images.length; i++) {
		if (images[i].id == imageid) {
			return images[i];
		}
	}
};