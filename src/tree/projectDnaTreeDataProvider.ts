import * as vscode from 'vscode';
import { NavigationTab } from '../models';
import { ProjectStateService } from '../services/projectStateService';

export class DnaTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tabId: NavigationTab,
    public readonly iconName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode
      .TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
    this.tooltip = `Project DNA: ${label}`;
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.contextValue = `dnaSection-${tabId}`;

    this.command = {
      command: 'project-dna.openSection',
      title: `Open ${label}`,
      arguments: [tabId],
    };
  }
}

export class ProjectDnaTreeDataProvider implements vscode.TreeDataProvider<DnaTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DnaTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DnaTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DnaTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(stateService: ProjectStateService) {
    stateService.onDidChangeState(() => {
      this.refresh();
    });
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: DnaTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: DnaTreeItem): vscode.ProviderResult<DnaTreeItem[]> {
    if (element) {
      // Prepared for future child node expansion in future milestones
      return [];
    }

    const sections: Array<{ label: string; tabId: NavigationTab; icon: string }> = [
      { label: 'Overview', tabId: 'overview', icon: 'dashboard' },
      { label: 'Structure', tabId: 'structure', icon: 'folder-opened' },
      { label: 'Architecture', tabId: 'architecture', icon: 'layers' },
      { label: 'Graph', tabId: 'graph', icon: 'type-hierarchy' },
      { label: 'Technology', tabId: 'technology', icon: 'symbol-namespace' },
      { label: 'Dependencies', tabId: 'dependencies', icon: 'package' },
      { label: 'APIs', tabId: 'apis', icon: 'symbol-interface' },
      { label: 'Configuration', tabId: 'configuration', icon: 'gear' },
      { label: 'Git', tabId: 'git', icon: 'git-branch' },
    ];

    return sections.map((sec) => new DnaTreeItem(sec.label, sec.tabId, sec.icon));
  }
}
