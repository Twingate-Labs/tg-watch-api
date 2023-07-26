# tg-watch-api
2. cluster-role-binding.yaml: 
   1. make sure the subjects.namespace is the same namespace as the tg-watch-api application
   2. if no-default service account is used for tg-watch-api then change subjects.name to the corresponding service account name
