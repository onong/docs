const releases = require('./releases.json');

const variables = {
  releaseTitle: 'v3.21.0-2.0',
  cloudUserVersion: 'v21.3.0',
  prodname: 'Calico Cloud',
  manifestsUrl: 'https://raw.githubusercontent.com/projectcalico/calico/v3.30.2',
  prodnamedash: 'calico-cloud',
  baseUrl: '/calico-cloud',
  filesUrl: 'https://docs.calicocloud.io',
  filesUrl_CE: 'https://downloads.tigera.io/ee/v3.21.0-2.0',
  tutorialFilesURL: 'https://docs.tigera.io/files',
  prodnameWindows: 'Calico Enterprise for Windows',
  rootDirWindows: 'C:\\TigeraCalico',
  nodecontainer: 'cnx-node',
  noderunning: 'calico-node',
  cloudversion: 'v3.21.0-2.0-12',
  clouddownloadurl: 'https://installer.calicocloud.io/manifests/v3.21.0-2.0-12',
  clouddownloadbase: 'https://installer.calicocloud.io',
  cloudoperatorimage: 'quay.io/tigera/cc-operator',
  imageassuranceversion: 'v1.22.7',
  tigeraOperator: releases[0]['tigera-operator'],
  dikastesVersion: releases[0].components.dikastes.version,
  releases,
  registry: 'quay.io/',
  imageNames: {
    node: 'tigera/cnx-node',
    kubeControllers: 'tigera/kube-controllers',
  },
};

module.exports = variables;
