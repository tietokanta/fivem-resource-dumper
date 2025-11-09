const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const ResourceDecryptor = require('./resource-decryptor');
const uuid = require('uuid')

let server_url;
let download_streams;
let download_only_streams;

axios.defaults.timeout = 0;

let resources = []

const load_config = async () => {
    const config = await fs.readFile('./config.json', 'utf8');
    const config_json = JSON.parse(config);

    server_url = config_json.server_url;
    download_streams = config_json.save_streams;
    download_only_streams = config_json.save_only_streams;

    console.log(`[+] Starting to dump ${server_url}`)
}

const get_configuration = async () => {
    const res = await axios.post(`${server_url}/client`, "method=getConfiguration", {
        headers: {
            "User-Agent": "CitizenFX/1"
        }
    });

    if (res.status == 200) {
        return {
            data: res.data,
            ok: true
        };
    } else {
        console.log(`[!] Failed to retrieve server data, are you in the server?`)
        return {
            data: null,
            ok: false
        };
    }
}

async function download_file_buffer(url, outputPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            }),
            headers: {
                "User-Agent": "CitizenFX/1",
            },
            responseType: 'arraybuffer'
        });

        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(outputPath, response.data);

        return outputPath;

    } catch (error) {
        console.error(`[!] Error downloading ${url}:`, error.message);
        throw error;
    }
}

async function folderExists(folderPath) {
    try {
        await access(folderPath, constants.F_OK);
        return true;
    } catch (error) {
        return false;
    }
}


(async () => {
    await load_config();

    const configuration = await get_configuration();

    if (!configuration.ok) return;

    resources = configuration.data.resources || [];

    if (resources.length <= 0) {
        console.log(`[!] No resources detected. Try again`)
        return;
    }

    for (const resource of resources) {
        const server_folder_name = server_url.replace(/[^\w.-]/g, "_");

        try {
            console.log(`[-] Processing: ${resource.name}`);

            const decryptor = new ResourceDecryptor()
            const uri_b64 = resource.uri.split('v3#')[1];

            if (!download_only_streams) {
                let resource_rpf_url = null
                let hash = resource.files["resource.rpf"];

                if (resource.hasOwnProperty('fileServer')) {
                    resource_rpf_url = resource.fileServer + `/${resource.name}/resource.rpf?hash=${hash}`
                } else {
                    resource_rpf_url = `${server_url}/files/${resource.name}/resource.rpf?hash=${hash}`
                }

                let file_path = `./tmp/${uuid.v7()}.tmp`

                await download_file_buffer(resource_rpf_url, file_path)

                await decryptor.decryptAndDump(uri_b64, file_path, `./${server_folder_name}/${resource.name}`)

                await fs.unlink(file_path)
            }


            // process stream files

            if (resource.hasOwnProperty('streamFiles') && (download_streams || download_only_streams)) {

                for (const fileName in resource.streamFiles) {
                    const fileData = resource.streamFiles[fileName];

                    let file_path = `./tmp/${uuid.v7()}.tmp`

                    let stream_file_url = null

                    if (resource.hasOwnProperty('fileServer')) {
                        stream_file_url = resource.fileServer + `/${resource.name}/${fileName}?hash=${fileData['hash']}`
                    } else {
                        stream_file_url = `${server_url}/files/${resource.name}/${fileName}?hash=${fileData['hash']}`
                    }

                    const outDir = `./${server_folder_name}/${resource.name}/stream`;

                    if (!(await folderExists(outDir))) {
                        await fs.mkdir(outDir, { recursive: true });
                    }

                    await download_file_buffer(stream_file_url, file_path)

                    await decryptor.decryptResource(uri_b64, file_path, `${outDir}/${fileName}`, fileName)

                    await fs.unlink(file_path)
                }
            }

            console.log(`[+] Completed: ${resource.name}`);

        } catch (error) {
            console.error(`[!] Failed to process ${resource.name}:`, error.message);
        }


    }

})();