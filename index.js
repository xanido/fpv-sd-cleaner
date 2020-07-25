const drivelist = require('drivelist');
const ffmpeg = require('fluent-ffmpeg');
const fs = require( 'fs' );
const path = require( 'path' );

(async () => {

    // print list of non-system drives
    const drives = await drivelist.list();
    const userDrives = drives.filter(drive => !drive.isSystem);
    userDrives.map((drive, index) => {
        const { description, mountpoints } = drive;
        const mountpoint = mountpoints[0];
        const humanIndex = index + 1;
        console.log(`${humanIndex}. ${mountpoint.label} (${mountpoint.path})`);
    });

    // hardcoded for now - it's late i'm tiired :(
    const dataPath = '/Volumes/DRONE/VIDEO/';
    const files = fs.readdirSync( dataPath );

    // filter files in the dir, only vids starting with CADDX and
    // greater than 60secs
    const flightVids = files.map(async (file) => {
        const filePath = path.join(dataPath, file);
        const stat = fs.statSync( filePath );
        if( !stat.isFile() ) return false;
        if(file.indexOf('CADDX') !== 0) return false;

        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, function(err, metadata) {
                if(err) { console.log(err); return false; }
                const duration = metadata.format.duration;
                const humanDuration = new Date(1000 * metadata.format.duration).toISOString().substr(14, 5)
                console.log(`${path.basename(filePath)} - ${humanDuration} ${duration < 60 ? 'JUNK' : ''}`);
                if(duration < 60) {
                    fs.unlinkSync(filePath);
                    resolve();
                }
                resolve(file);
            });
        });
    });

    // rename the actual flight vids
    (await Promise.all(flightVids)).filter(Boolean).sort().map((file, index) => {
        const filePath = path.join(dataPath, file);
        fs.renameSync(filePath, path.join(dataPath, 'FLIGHT_' + (index + 1) + path.extname(file)));
    });

})();
