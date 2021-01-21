import { ExecCommand, SetLayerInfo, ToolbarGroupInfo, SetItemActive, SetItemWidth } from '@t/ui';
import { Emitter } from '@t/event';
import html from '@/new/vdom/template';
import { Component } from '@/new/vdom/component';
import { ToolbarButton } from './toolbarButton';

interface Props {
  tooltipEl: HTMLElement;
  disabled: boolean;
  group: ToolbarGroupInfo;
  hidden: boolean;
  hiddenDivider: boolean;
  eventEmitter: Emitter;
  execCommand: ExecCommand;
  setLayerInfo: SetLayerInfo;
  setItemActive: SetItemActive;
  setItemWidth?: SetItemWidth;
}

export class ToolbarGroup extends Component<Props> {
  render() {
    const { group, hiddenDivider } = this.props;
    const groupStyle = { display: group.hidden ? 'none' : 'inline-block' };
    const dividerStyle = { display: hiddenDivider ? 'none' : 'inline-block' };

    return html`
      <div class="te-toolbar-group" style=${groupStyle}>
        ${group.map(
          item =>
            html`
              <${ToolbarButton} item=${item} ...${this.props} />
            `
        )}
        <div class="tui-toolbar-divider" style=${dividerStyle}></div>
      </div>
    `;
  }
}
