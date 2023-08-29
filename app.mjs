import * as k8s from '@kubernetes/client-node';
import {TwingateUtilManager} from "./TwingateUtilManager.mjs";
import dotenvPkg from 'dotenv';
import AsyncLock from 'async-lock';

// Code below is a sample that uses Kubernetes watch API to monitor ingress changes and create Twingate resources
// Note: GKE does not fire delete events for ingress

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

dotenvPkg.config();

const delay = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

const watch = new k8s.Watch(kc);


let [remoteNetwork, domainList, group] = [process.env.TG_REMOTE_NETWORK, process.env.DOMAIN_LIST.split(","), process.env.TG_GROUP_NAME];


const main = async () => {
    try {
        const utilManager = new TwingateUtilManager();

        const remoteNetworkId = await utilManager.lookupRemoteNetworkByName(remoteNetwork);

        const groupId = await utilManager.lookupGroupByName(group);

        // Get all resources in the remote network
        let resources = await utilManager.fetchAllResourcesInRemoteNetwork(remoteNetworkId);

        let continueWatch = true;
        while (continueWatch) {
            resources = await utilManager.fetchAllResourcesInRemoteNetwork(remoteNetworkId);
            continueWatch = await watchForChanges(utilManager, remoteNetworkId, groupId, resources);
        }

    } catch (err) {
        console.error(err);
        throw err;
    }
};


const watchForChanges = async (utilManager, remoteNetworkId, groupId, resources) => {
    console.log("Start or Restarting Watching For Changes.")
    let continueWatch = true;
    // Start watch for K8S ingress changes

    let lock = new AsyncLock()

    let hosts = [];

    const req = await watch.watch(
        '/apis/networking.k8s.io/v1/ingresses',
        {},
        async (type, apiObj) => {
            if (type != 'ADDED') {
                console.log('unknown type: ' + type);
                return;
            }
            const host = apiObj.spec.rules[0].host;

            // Check if the ingress host is part of the domain list
            if (domainList.filter(domainList => host.endsWith(domainList)).length !== 0) {
                if (hosts.includes(host)) {
                    console.log(`Skipping: resource '${host}' - resource being created`);
                    return
                }
            }
            else {
                console.log(`Skipping: ingress ${apiObj.metadata.name} is not part of domain list.`);
                return;
            }

            lock.acquire(host, async function() {

                if (hosts.includes(host)) {
                    console.log(`Skipping: resource '${host}' - resource being created`);
                    return
                }

                if (resources.map(resource => resource.address.value).includes(host)) {
                    console.log(`Skipping: resource '${host}' with name '${apiObj.metadata.name}' has already been created in remote network ${remoteNetwork} previously.`);
                    return;
                }
                hosts.push(host);
                await utilManager.createResource(apiObj.metadata.name, host, remoteNetworkId, undefined, groupId);
                console.log(`New Ingress Found: creating resource '${host}' with name '${apiObj.metadata.name}' in remote network ${remoteNetwork}`);

            }, function(err, ret) {
                console.log("Lock Released")
            }, {});


        },
        // done callback is called if the watch terminates normally
        (err) => {
            console.warn(`Watch error: ${err}. This message should be harmless.`);
        },
    );

    // Watch for x ms before starting a new watch api call
    await delay(600000);
    return continueWatch;
}

main();