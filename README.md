# FiveM Network based resource dumper

This resource dumper does no inject in to the game at all and just decrypts the resource files from servers.
## Installation

Install required dependencies.

```sh
  cd network-dumper
  npm install
```
    
## Configuration

All the configuration is found in the config.json file. You can get the server IP from this tool [fivemx.com](https://fivemx.com/fivem-server-ip-finder), the default port is 30120.

Example config.json:
```json
{
    "server_url": "http://IP:PORT",
    "save_streams": false,
    "save_only_streams": false
}
```
## How to Use?

- Load in to your server of choice
- Run the `index.js` file
- Enjoy



**Disclaimer:** For educational use only. The author is not responsible for how this project is used. No warranties.
