var async, fs, path, util;

fs = require('fs');

async = require('async');

util = require('../util');

path = require('path');

module.exports = function(app) {
    var add_video, db, flash, photos, process_save, staff;
    photos = require('./photos');
    staff = app.get('implied').users.staff;
    flash = require("../util").flash;
    db = app.get('db');

    /*
     * process file data in request
     */
    process_save = function(req, callback) {

        /*
         * Save file data to local storage on server
         */
        var entry, filePath, obj_id, save_file, save_task_arr;
        save_file = function(args, callback) {
            var newPath;
            newPath = filePath + args.file.name;
            return fs.readFile(args.file.path, function(err, data) {
                return fs.writeFile(newPath, data, function(err) {
                    var cmd_480p, cmd_720p;
                    if (args.type === 'image') {
                        return photos.convert_img({
                            filePath: filePath,
                            name: args.file.name,
                            crop: false,
                            resize: true,
                            orient: true,
                            effect: args.effect
                        }, callback);
                    } else {
                        cmd_720p = 'HandBrakeCLI -i "' + newPath + '" -o "' + filePath + '720p-' + args.file.name +
                            '" -t 1 -c 1 -f mp4 -O  -w 1280 --loose-anamorphic  -e x264 -q 26 -a 1 -E faac -6 stereo -R Auto -B 128 -D 0.0 -x ref=2:bframes=2:subq=6:mixed-refs=0:weightb=0:8x8dct=0:trellis=0 &> /tmp/handbrake.720.log';
                        cmd_480p = 'HandBrakeCLI -i "' + newPath + '" -o "' + filePath + '480p-' + args.file.name +
                            '" -t 1 -c 1 -f mp4 -O  -w 854 --loose-anamorphic  -e x264 -q 28 -a 1 -E faac -6 stereo -R Auto -B 128 -D 0.0 -x ref=2:bframes=2:subq=6:mixed-refs=0:weightb=0:8x8dct=0:trellis=0 &> /tmp/handbrake.480.log';
                        console.log(cmd_720p);
                        console.log(cmd_480p);

                        /*
                        #cmd = 'avconv -loglevel quiet -y -i "' + newPath + '" -s vga -b 800k -c:v libx264 -r 23.976 -acodec ac3 -ac 1 -ar 22050 -ab 64k "' + filePath + 'stream-' + args.file.name + '"'
                         * Don't wait for processing - it takes forever.
                         */
                        util.syscall(cmd_720p, null, false);
                        util.syscall(cmd_480p, null, false);
                        return callback(null, true);
                    }
                });
            });
        };
        entry = req.body;
        obj_id = {
            _id: req.params.id
        };

        /*
         * File upload directory
         */
        filePath = path.join(app.get('upload_dir'), "site/videos/");
        entry.content = entry.content.replace(/\r\n/g, '<br>');
        save_task_arr = [];
        return util.syscall('mkdir -p ' + filePath, function() {

            /*
             * If user uploaded data, store tasks to process files in save_task_arr
             */
            if (req.files.image.size === 0) {
                entry.image = entry.prev_image;
            } else {
                entry.image = req.files.image.name;
                save_task_arr.push({
                    filePath: filePath,
                    file: req.files["image"],
                    type: 'image',
                    crop: false,
                    resize: true,
                    orient: true,
                    effect: 'none'
                });
            }
            if (req.files.video.size === 0) {
                entry.video = entry.prev_video;
            } else {
                entry.video = req.files.video.name;
                save_task_arr.push({
                    filePath: filePath,
                    file: req.files["video"],
                    type: 'video'
                });
            }

            /*
             * If no data was uploaded by the user, set image and video to previous values.
             */
            if (save_task_arr.length === 0) {
                return callback();
            }

            /*
             * We process the save file tasks asynchronously.
             *
             * concatSeries - Applies save_file to each item in save_task_arr, concatenating the boolean results.
             * An OR operation is performed for each boolean result, finalizing in a single true or false.
             */
            return async.concatSeries(save_task_arr, save_file, function(err, results) {
                if (err) {
                    console.error(err);
                    console.error("results were:", results);
                }
                return callback();
            });
        });
    };
    add_video = function(req, res) {
        return res.render("admin/video-add", {
            rec: {}
        });
    };
    app.get("/admin/add-video", staff, add_video);
    app.post("/admin/add-video", staff, function(req, res) {
        return process_save(req, function() {
            if (!req.body.title) {
                flash('Title is required.');
                add_video(req, res);
            } else {
                req.body._id = req.body.title.toLowerCase().replace(/\s/g, '-');
            }
            return db.collection('videos').findOne({
                _id: req.body._id
            }, function(err, entry) {
                if (entry) {
                    flash('Title is already used.');
                    return add_video(req, res);
                } else {
                    return db.collection("videos").insert(req.body, function(err, entry) {
                        if (err) {
                            console.error(err);
                        }
                        return res.redirect('/admin/videos');
                    });
                }
            });
        });
    });
    app.get("/admin/videos", staff, function(req, res) {
        return db.collection('videos').find().sort({
            title: 1
        }).toArray(function(err, entries) {
            return res.render("admin/video-list", {
                req: req,
                email: req.session.email,
                entries: entries
            });
        });
    });
    app.get("/admin/videos/:id", staff, function(req, res) {
        return db.collection('videos').findOne({
            $or: [{
                _id: req.params.id
            }, {
                slug_field: req.params.id
            }]
        }, function(err, rec) {
            return res.render("admin/video-add", {
                title: req.params.collection,
                req: req,
                email: req.session.email,
                rec: rec
            });
        });
    });

    /*
     * Ajax.
     */
    app.get("/admin/videos/:id/delete", staff, function(req, res) {
        return db.collection('videos').remove({
            $or: [{
                _id: req.params.id
            }, {
                slug_field: req.params.id
            }]
        }, function(err, rec) {
            if (err) {
                console.error(err);
            }
            return res.send({
                success: err === null,
                message: err
            });
        });
    });
    return app.post("/admin/videos/:id", staff, function(req, res) {
        return process_save(req, function() {
            delete req.body._id;
            console.log('saving', req.body);
            return db.collection('videos').update({
                _id: req.params.id
            }, req.body, false, function(err) {
                if (err) {
                    return res.send({
                        success: false,
                        error: err
                    });
                }
                return res.redirect('/admin/videos');
            });
        });
    });
};
