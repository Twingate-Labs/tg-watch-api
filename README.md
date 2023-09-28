# tg-watch-api
This project provides an example that uses Kubernetes watch API to monitor ingress changes and create Twingate resources

## Prerequisites
1. A working Kubernetes Cluster
2. Kubectl

## How to Use
1. Clone the project
```
git clone https://github.com/Twingate-Labs/tg-watch-api
cd tg-watch-api
```
2. modify [cluster-role-binding.yaml](templates/cluster-role-binding.yaml)
   1. _subjects.name_: name of the service account if you do not want to use namespace default service account
   2. _subjects.namespace_: namespace of the cluster-role-binding, make sure this is the same namespace as the tg-watch-api application
3. apply [cluster-role.yaml](templates/cluster-role.yaml) and [cluster-role-binding.yaml](templates/cluster-role-binding.yaml)
```
kubectl -n {namespace} apply -f templates/cluster-role.yaml -f templates/cluster-role-binding.yaml
```
4. modify [.example-env](.example-env)
   1. TG_API_KEY: Twingate API Key
   2. TG_ACCOUNT: Full URL of the Twingate tenant e.g. acme.twingate.com
   3. TG_REMOTE_NETWORK: Twingate remote network to create the resource in
   4. TG_GROUP_NAME: Twingate group which can access the created resources
   5. DOMAIN_LIST: List of domain names to create Twingate resources i.e. the application would not create resource if the ingress host is not part of this list
5. create secret using [.example-env](.example-env), this need to be created in the same namespace as the tg-watch-api application
```
kubectl -n {namespace} create secret generic tg-watch-api --from-env-file=.example-env
```
4. deploy the tg-watch-api application
```
kubectl -n {namespace} apply -f templates/statefulset.yaml
```

## How to Delete the Application
```
kubectl -n {namespace} delete -f templates/statefulset.yaml -f templates/cluster-role.yaml -f templates/cluster-role-binding.yaml
kubectl -n {namespace} delete secrete tg-watch-api
```

## Known Limitations
1. Ingress deletion events are not covered by this example as GKE does not fire delete events for ingress
2. Ingress modification events are not covered by this example
3. Currently, the statefulset only supports replica of 1
