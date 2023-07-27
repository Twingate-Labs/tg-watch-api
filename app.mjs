import * as k8s from '@kubernetes/client-node';
import {TwingateUtilManager} from "./TwingateUtilManager.mjs";

// Code below is a sample that uses Kubernetes watch API to monitor ingress changes and create Twingate resources
// Note: GKE does not fire delete events for ingress

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const watch = new k8s.Watch(kc);

import dotenvPkg from 'dotenv';

dotenvPkg.config();


let [remoteNetwork, domainList, group] = [process.env.TG_REMOTE_NETWORK, process.env.DOMAIN_LIST.split(","), process.env.TG_GROUP_NAME];

const main = async () => {
    try {
        const utilManager = new TwingateUtilManager();

        const remoteNetworkId = await utilManager.lookupRemoteNetworkByName(remoteNetwork);

        const groupId = await utilManager.lookupGroupByName(group);

        // Get all resources in the remote network
        let resources = await utilManager.fetchAllResourcesInRemoteNetwork(remoteNetworkId);

        // Start watch for K8S ingress changes
        const req = await watch.watch(
            '/apis/networking.k8s.io/v1/ingresses',
            {},
            async (type, apiObj) => {
                if (type === 'ADDED') {
                    const host = apiObj.spec.rules[0].host;

                    // Check if the ingress host is part of the domain list
                    if (domainList.filter(domainList => host.endsWith(domainList)).length !== 0) {

                        // Check if resource already exists in the remote network
                        if (!resources.map(resource => resource.address.value).includes(host)) {
                            // Create resource in Twingate with
                            // resource name: ingress name
                            // resource address: ingress first rule's host
                            // resource group: predefined group name
                            await utilManager.createResource(apiObj.metadata.name, host, remoteNetworkId, undefined, groupId);
                            console.log(`New Ingress Found: creating resource '${host}' with name '${apiObj.metadata.name}' in remote network ${remoteNetwork}`);

                            // refresh the remote network resources
                            resources = await utilManager.fetchAllResourcesInRemoteNetwork(remoteNetworkId);
                        } else {
                            console.log(`Skipping: resource '${host}' with name '${apiObj.metadata.name}' has already been created in remote network ${remoteNetwork} previously.`);
                        }
                    } else {
                        console.log(`Skipping: ingress ${apiObj.metadata.name} is not part of domain list.`);
                    }
                } else {
                    console.log('unknown type: ' + type);
                }
            },
            // done callback is called if the watch terminates normally
            (err) => main(),
        );

        setTimeout(() => {
        }, 5000);
    } catch (err) {
        console.error(err);
        throw err;
    }
};

main();