/* eslint-disable no-console */
import * as React from 'react';
import { Button, PageSection, TextInput } from '@patternfly/react-core';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sModel,
  k8sPatchResource,
  K8sResourceCommon,
  k8sUpdateResource,
  // useK8sWatchResource,
  // WatchK8sResource,
} from '../dynamic-plugin-sdk';
import { ApplicationModel, ComponentModel } from '../models';

const ProjectModel: K8sModel = {
  apiVersion: 'v1',
  apiGroup: 'project.openshift.io',
  kind: 'Project',
  abbr: 'PR',
  label: 'Project',
  labelPlural: 'Projects',
  plural: 'projects',
};
const ConfigMapModel: K8sModel = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  abbr: 'CM',
  plural: 'configmaps',
  labelPlural: 'ConfigMaps',
  label: 'ConfigMap',
  namespaced: true,
};

enum ActionType {
  LIST = 'list',
  CREATEAPP = 'create-app',
  CREATECOMP = 'create-comp',
  GETAPP = 'get-app',
  GETCOMP = 'get-comp',
  PATCH = 'patch',
  PUT = 'put',
  DELETE = 'delete',
}

// const initResource: WatchK8sResource = {
//   groupVersionKind: { version: 'v1', kind: 'ConfigMap' },
//   name: 'test',
//   namespace,
// };

const TestK8s: React.FC = () => {
  const [r, setR] = React.useState(null);
  const [namespace, setNamespace] = React.useState<string>('default');
  const [name, setName] = React.useState<string>('test');
  const [status, setStatus] = React.useState<string>('');
  const [action, setAction] = React.useState<ActionType | null>(null);

  // TODO: make hook work sanely
  // const result = useK8sWatchResource(initResource);
  // console.debug('render result', result);

  React.useEffect(() => {
    const testConfigMapMetadata = {
      metadata: {
        name,
        namespace,
      },
    };
    const testConfigMapData: K8sResourceCommon & { [key: string]: any } = {
      apiVersion: ConfigMapModel.apiVersion,
      kind: ConfigMapModel.kind,
      ...testConfigMapMetadata,
      data: {
        test: 'true',
      },
    };

    const applicationData = {
      apiVersion: `${ApplicationModel.apiGroup}/${ApplicationModel.apiVersion}`,
      kind: ApplicationModel.kind,
      ...testConfigMapMetadata,
      spec: {
        displayName: 'Test Application',
      },
    };

    const componentData = {
      apiVersion: `${ComponentModel.apiGroup}/${ComponentModel.apiVersion}`,
      kind: 'Component',
      ...testConfigMapMetadata,
      spec: {
        componentName: 'Backend',
        application: applicationData.metadata.name,
        source: {
          git: { url: 'https://github.com/devfile-samples/devfile-sample-java-springboot-basic' },
        },
      },
    };

    let promise = null;
    switch (action) {
      case ActionType.LIST:
        // TODO: this can work sorta for getting your namespace value
        // response[0].metadata.name === your namespace
        promise = k8sListResource({
          model: ProjectModel,
        }).then((data) => {
          // Lock in the namespace
          let ns = null;
          if (Array.isArray(data)) {
            const namespaces = data.map((dataResource) => dataResource.metadata.name);
            console.debug('++++available namespaces:', namespaces);
            ns = namespaces[0];
          } else if (data?.metadata?.namespace) {
            ns = data.metadata.namespace;
          }

          if (ns) {
            setAction(null); // prevent re-invoking this effect/call
            setNamespace(ns);
          } else {
            // eslint-disable-next-line no-alert
            alert(
              'Could not find namespace; you are likely not able to do much as we are targeting "default"',
            );
          }
          return data;
        });
        break;
      case ActionType.CREATEAPP:
        promise = k8sCreateResource({
          model: ApplicationModel,
          data: applicationData,
        });
        break;
      case ActionType.GETAPP:
        promise = k8sGetResource({
          model: ApplicationModel,
          name: applicationData.metadata.name,
          ns: applicationData.metadata.namespace,
        });
        break;
      case ActionType.CREATECOMP:
        promise = k8sCreateResource({
          model: ComponentModel,
          data: componentData,
        });
        break;
      case ActionType.GETCOMP:
        promise = k8sGetResource({
          model: ComponentModel,
          name: componentData.metadata.name,
          ns: applicationData.metadata.namespace,
        });
        break;
      case ActionType.PATCH:
        promise = k8sPatchResource({
          model: ApplicationModel,
          resource: applicationData,
          data: [
            {
              op: 'replace',
              path: '/spec/displayName',
              value: 'New Test Application',
            },
          ],
        });
        break;
      case ActionType.PUT:
        promise = k8sUpdateResource({
          model: ConfigMapModel,
          name: testConfigMapMetadata.metadata.name,
          ns: testConfigMapMetadata.metadata.namespace,
          data: { ...testConfigMapData, data: { ...testConfigMapData.data, new: 'prop' } },
        });
        break;
      case ActionType.DELETE:
        promise = k8sDeleteResource({
          model: ComponentModel,
          resource: componentData,
        });
        break;
      case null:
        // ignore effect
        break;
      default:
        // this shouldn't happen, catch state for missed cases
        throw new Error('uh oh!');
    }
    promise
      ?.then((data) => {
        setStatus(`${action} response:`);
        setR(data);
        console.debug(`++++${action}!`, data);
      })
      .catch((err) => {
        console.error(`++++failed ${action}`, err);
        setStatus('failed call');
        setR(null);
      });
  }, [action, name, namespace]);

  return (
    <PageSection>
      <TextInput placeholder="ConfigMap name" onChange={(v) => setName(v)} value={name} />
      <div>
        <p>
          Test calls -- predefined data; use the above input to make/update/get multiple ConfigMaps
        </p>
        {Object.values(ActionType).map((v) => (
          <React.Fragment key={v}>
            <Button
              isDisabled={v !== ActionType.LIST && namespace === 'default'}
              onClick={() => setAction(v)}
            >
              {v}
            </Button>{' '}
          </React.Fragment>
        ))}
        In `{namespace}` namespace
      </div>
      <div>{status}</div>
      {r && <pre>{JSON.stringify(r, null, 2)}</pre>}
    </PageSection>
  );
};

export default TestK8s;
