import {TwingateApiClient} from './TwingateApiClient.mjs';
import dotenvPkg from 'dotenv';

dotenvPkg.config();


let [tgAccount, tgApiKey] = [process.env.TG_ACCOUNT, process.env.TG_API_KEY]

const applicationName = "Twingate-tg-watch-api/0.0.1"

export class TwingateUtilManager {
    constructor() {
        this.apiClient = new TwingateApiClient(tgAccount, tgApiKey, {
            applicationName
        });
    }

    async lookupRemoteNetworkByName(remoteNetwork) {
        return await this.apiClient.lookupRemoteNetworkByName(remoteNetwork)
    }

    async lookupGroupByName(group) {
        return await this.apiClient.lookupGroupByName(group)
    }


    async fetchAllResourcesInRemoteNetwork(remoteNetwork, opts) {
        let query = this.apiClient.getRootNodePagedQuery("RemoteNetworkResource", "remoteNetwork", "resources", ["id", "name", "address{value}"])
        return await this.apiClient.fetchAllRootNodePages(query, {id: remoteNetwork});
    }

    async createResource(name, address, remoteNetworkId, protocols = null, groupIds = []) {
        return await this.apiClient.createResource(name, address, remoteNetworkId, protocols, groupIds)
    }

}
