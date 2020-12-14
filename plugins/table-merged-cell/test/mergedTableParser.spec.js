/**
 * @fileoverview Test merged table parser
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
import { source } from 'common-tags';
import { Parser, createRenderHTML } from '@toast-ui/toastmark';
import { parser as customParser } from '@/parser';
import { renderer as customRenderer } from '@/renderer';

const parser = new Parser({ customParser });
const renderHTML = createRenderHTML({ gfm: true, convertors: customRenderer });

describe('should render the merged table properly', () => {
  it('basic table', () => {
    const content = source`
      | head1 | head2 |
      | --- | --- |
      | cell1 | cell2 |
    `;
    const result = source`
      <table>
      <thead>
      <tr>
      <th>head1</th>
      <th>head2</th>
      </tr>
      </thead>
      <tbody>
      <tr>
      <td>cell1</td>
      <td>cell2</td>
      </tr>
      </tbody>
      </table>
    `;

    const root = parser.parse(content);
    const html = renderHTML(root);

    expect(html).toBe(`${result}\n`);
  });

  it('with colspan header', () => {
    const content = source`
      | @cols=2:mergedHead1 | @cols=2:mergedHead2 |
      | --- | --- | --- | --- |
      | cell1 | cell2 | cell3 | cell4 |
    `;
    const result = source`
      <table>
      <thead>
      <tr>
      <th colspan="2">mergedHead1</th>
      <th colspan="2">mergedHead2</th>
      </tr>
      </thead>
      <tbody>
      <tr>
      <td>cell1</td>
      <td>cell2</td>
      <td>cell3</td>
      <td>cell4</td>
      </tr>
      </tbody>
      </table>
    `;

    const root = parser.parse(content);
    const html = renderHTML(root);

    expect(html).toBe(`${result}\n`);
  });

  it('with colspan header, body', () => {
    const content = source`
      | @cols=2:mergedHead1 | @cols=2:mergedHead2 |
      | --- | --- | --- | --- |
      | @cols=2:mergedCell1 | cell2 | cell3 |
    `;
    const result = source`
      <table>
      <thead>
      <tr>
      <th colspan="2">mergedHead1</th>
      <th colspan="2">mergedHead2</th>
      </tr>
      </thead>
      <tbody>
      <tr>
      <td colspan="2">mergedCell1</td>
      <td>cell2</td>
      <td>cell3</td>
      </tr>
      </tbody>
      </table>
    `;

    const root = parser.parse(content);
    const html = renderHTML(root);

    expect(html).toBe(`${result}\n`);
  });

  it('with rowspan body', () => {
    const content = source`
      | head1 | head2 |
      | --- | --- |
      | cell1-1 | @rows=2:cell1-2  |
      | cell2-1 | cell2-2  |
    `;
    const result = source`
      <table>
      <thead>
      <tr>
      <th>head1</th>
      <th>head2</th>
      </tr>
      </thead>
      <tbody>
      <tr>
      <td>cell1-1</td>
      <td rowspan="2">cell1-2</td>
      </tr>
      <tr>
      <td>cell2-1</td>
      </tr>
      </tbody>
      </table>
    `;

    const root = parser.parse(content);
    const html = renderHTML(root);

    expect(html).toBe(`${result}\n`);
  });

  describe('with rowspan, colspan', () => {
    const examples = [
      {
        no: 1,
        content: source`
        | @cols=2:mergedHead1 | @cols=2:mergedHead2 |
        | --- | --- | --- | --- |
        | @cols=2:mergedCell1-1 | cell1-2 | cell1-3 |
        | @rows=3:mergedCell2-1 | cell2-2 | cell2-3 | cell2-4 |
        | cell3-1 | cell3-2 | cell3-3 | cell3-4 |
        | cell4-1 | cell4-2 | cell4-3 | cell4-4 |
        | cell5-1 | cell5-2 | cell5-3 | cell5-4 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">mergedHead1</th>
        <th colspan="2">mergedHead2</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">mergedCell1-1</td>
        <td>cell1-2</td>
        <td>cell1-3</td>
        </tr>
        <tr>
        <td rowspan="3">mergedCell2-1</td>
        <td>cell2-2</td>
        <td>cell2-3</td>
        <td>cell2-4</td>
        </tr>
        <tr>
        <td>cell3-1</td>
        <td>cell3-2</td>
        <td>cell3-3</td>
        </tr>
        <tr>
        <td>cell4-1</td>
        <td>cell4-2</td>
        <td>cell4-3</td>
        </tr>
        <tr>
        <td>cell5-1</td>
        <td>cell5-2</td>
        <td>cell5-3</td>
        <td>cell5-4</td>
        </tr>
        </tbody>
        </table>
      `
      },
      {
        no: 2,
        content: source`
        | @cols=2:mergedHead1 | @cols=2:mergedHead2 |
        | --- | --- | --- | --- |
        | @cols=2:mergedCell1-1 | cell1-2 | cell1-3 |
        | @rows=2:mergedCell2-1 | cell2-2 | cell2-3 | cell2-4 |
        | cell3-1 | cell3-2 | cell3-3 | cell3-4 |
        | @cols=3:@rows=2:cell4-1 | cell4-2 | cell4-3 | cell4-4 |
        | cell5-1 | cell5-2 | cell5-3 | cell5-4 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">mergedHead1</th>
        <th colspan="2">mergedHead2</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">mergedCell1-1</td>
        <td>cell1-2</td>
        <td>cell1-3</td>
        </tr>
        <tr>
        <td rowspan="2">mergedCell2-1</td>
        <td>cell2-2</td>
        <td>cell2-3</td>
        <td>cell2-4</td>
        </tr>
        <tr>
        <td>cell3-1</td>
        <td>cell3-2</td>
        <td>cell3-3</td>
        </tr>
        <tr>
        <td colspan="3" rowspan="2">cell4-1</td>
        <td>cell4-2</td>
        </tr>
        <tr>
        <td>cell5-1</td>
        </tr>
        </tbody>
        </table>
      `
      },
      {
        no: 3,
        content: source`
        | @cols=2:mergedHead1 | @cols=2:mergedHead2 |
        | --- | --- | --- | --- |
        | @cols=2:mergedCell1-1 | cell1-2 | cell1-3 |
        | @rows=2:mergedCell2-1 | cell2-2 | cell2-3 | cell2-4 |
        | cell3-1 | cell3-2 | cell3-3 | cell3-4 |
        | @cols=3:@rows=2:cell4-1 | cell4-2 | cell4-3 | cell4-4 |
        | @rows=2:cell5-1 | cell5-2 | cell5-3 | cell5-4 |
        | cell6-1 | cell6-2 | cell6-3 | cell6-4 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">mergedHead1</th>
        <th colspan="2">mergedHead2</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">mergedCell1-1</td>
        <td>cell1-2</td>
        <td>cell1-3</td>
        </tr>
        <tr>
        <td rowspan="2">mergedCell2-1</td>
        <td>cell2-2</td>
        <td>cell2-3</td>
        <td>cell2-4</td>
        </tr>
        <tr>
        <td>cell3-1</td>
        <td>cell3-2</td>
        <td>cell3-3</td>
        </tr>
        <tr>
        <td colspan="3" rowspan="2">cell4-1</td>
        <td>cell4-2</td>
        </tr>
        <tr>
        <td rowspan="2">cell5-1</td>
        </tr>
        <tr>
        <td>cell6-1</td>
        <td>cell6-2</td>
        <td>cell6-3</td>
        </tr>
        </tbody>
        </table>
      `
      },
      {
        no: 4,
        content: source`
        | @cols=2:mergedHead1 | @cols=5:mergedHead2 |
        | --- | --- | --- | --- | --- | --- | --- |
        | @cols=2:mergedCell1-1 | cell1-2 | cell1-3 | cell1-4 | cell1-5 | cell1-6 |
        | @rows=2:mergedCell2-1 | @rows=2:mergedCell2-2 | cell2-3 | cell2-4 | cell2-5 | cell2-6 |
        | cell3-1 | cell3-2 | cell3-3 | cell3-4 | cell3-5 | cell3-6 |
        | @cols=3:@rows=2:mergedCell4-1 | cell4-2 | cell4-3 | cell4-4 |
        | @rows=2:mergedCell5-1 | cell5-2 | cell5-3 | cell5-4 | cell5-5 |
        | cell6-1 | cell6-2 | cell6-3 | cell6-4 | cell6-5 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">mergedHead1</th>
        <th colspan="5">mergedHead2</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">mergedCell1-1</td>
        <td>cell1-2</td>
        <td>cell1-3</td>
        <td>cell1-4</td>
        <td>cell1-5</td>
        <td>cell1-6</td>
        </tr>
        <tr>
        <td rowspan="2">mergedCell2-1</td>
        <td rowspan="2">mergedCell2-2</td>
        <td>cell2-3</td>
        <td>cell2-4</td>
        <td>cell2-5</td>
        <td>cell2-6</td>
        <td></td>
        </tr>
        <tr>
        <td>cell3-1</td>
        <td>cell3-2</td>
        <td>cell3-3</td>
        <td>cell3-4</td>
        <td>cell3-5</td>
        </tr>
        <tr>
        <td colspan="3" rowspan="2">mergedCell4-1</td>
        <td>cell4-2</td>
        <td>cell4-3</td>
        <td>cell4-4</td>
        <td></td>
        </tr>
        <tr>
        <td rowspan="2">mergedCell5-1</td>
        <td>cell5-2</td>
        <td>cell5-3</td>
        <td>cell5-4</td>
        </tr>
        <tr>
        <td>cell6-1</td>
        <td>cell6-2</td>
        <td>cell6-3</td>
        <td>cell6-4</td>
        <td>cell6-5</td>
        <td></td>
        </tr>
        </tbody>
        </table>
      `
      },
      {
        no: 5,
        content: source`
        | @cols=2:mergedHead1 | @cols=5:mergedHead2 |
        | --- | --- | --- | --- | --- | --- | --- |
        | @cols=2:mergedCell1-1 | cell1-2 | @cols=2:@rows=5:mergedCell1-3 | cell1-4 | cell1-5 | cell1-6 |
        | @rows=2:mergedCell2-1 | @rows=2:mergedCell2-2 | cell2-3 | cell2-4 | cell2-5 | cell2-6 |
        | cell3-1 | cell3-2 |
        | @cols=3:@rows=2:mergedCell4-1 | cell4-2 |
        | cell5-1 | cell5-2 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">mergedHead1</th>
        <th colspan="5">mergedHead2</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">mergedCell1-1</td>
        <td>cell1-2</td>
        <td colspan="2" rowspan="5">mergedCell1-3</td>
        <td>cell1-4</td>
        <td>cell1-5</td>
        </tr>
        <tr>
        <td rowspan="2">mergedCell2-1</td>
        <td rowspan="2">mergedCell2-2</td>
        <td>cell2-3</td>
        <td>cell2-4</td>
        <td>cell2-5</td>
        </tr>
        <tr>
        <td>cell3-1</td>
        <td>cell3-2</td>
        <td></td>
        </tr>
        <tr>
        <td colspan="3" rowspan="2">mergedCell4-1</td>
        <td>cell4-2</td>
        <td></td>
        </tr>
        <tr>
        <td>cell5-1</td>
        <td>cell5-2</td>
        </tr>
        </tbody>
        </table>
      `
      },
      {
        no: 6,
        content: source`
        | @cols=2:mergedHead1 | @cols=3:mergedHead2 |
        | --- | --- | --- | --- | --- |
        | @cols=2:mergedCell1-1 | cell1-2 | @cols=2:@rows=5:mergedCell1-3 |
        | @rows=2:mergedCell2-1 | @rows=2:mergedCell2-2 | cell2-3 | cell2-4 | cell2-5 | cell2-6 |
        | cell3-1 |
        | cell4-1 | cell4-2 |
        | cell5-1 | cell5-2 | cell5-3 | cell5-4 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">mergedHead1</th>
        <th colspan="3">mergedHead2</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">mergedCell1-1</td>
        <td>cell1-2</td>
        <td colspan="2" rowspan="5">mergedCell1-3</td>
        </tr>
        <tr>
        <td rowspan="2">mergedCell2-1</td>
        <td rowspan="2">mergedCell2-2</td>
        <td>cell2-3</td>
        </tr>
        <tr>
        <td>cell3-1</td>
        </tr>
        <tr>
        <td>cell4-1</td>
        <td>cell4-2</td>
        <td></td>
        </tr>
        <tr>
        <td>cell5-1</td>
        <td>cell5-2</td>
        <td>cell5-3</td>
        </tr>
        </tbody>
        </table>
      `
      },
      {
        no: 7,
        content: source`
        | @cols=2:mergedHead1 | @cols=3:mergedHead2 |
        | --- | --- | --- | --- | --- |
        | @cols=2:mergedCell1-1 | @rows=3:mergedCell1-2 | @cols=2:@rows=5:mergedCell1-3 |
        | @rows=2:mergedCell2-1 | @rows=2:mergedCell2-2 |
        |
        | cell4-1 | cell4-2 |  |
        | cell5-1 | cell5-2 | cell5-3 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">mergedHead1</th>
        <th colspan="3">mergedHead2</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">mergedCell1-1</td>
        <td rowspan="3">mergedCell1-2</td>
        <td colspan="2" rowspan="5">mergedCell1-3</td>
        </tr>
        <tr>
        <td rowspan="2">mergedCell2-1</td>
        <td rowspan="2">mergedCell2-2</td>
        </tr>
        <tr></tr>
        <tr>
        <td>cell4-1</td>
        <td>cell4-2</td>
        <td></td>
        </tr>
        <tr>
        <td>cell5-1</td>
        <td>cell5-2</td>
        <td>cell5-3</td>
        </tr>
        </tbody>
        </table>
      `
      },
      {
        no: 8,
        content: source`
        | @cols=2:foo"bar" | @cols=2:<span style="color: red;">baz</span> |
        | --- | --- | --- | --- |
        | @cols=2:foo"bar" | cell1-2 | cell1-3 |
        | @rows=2:<span style="color: red;">baz</span> | cell2-2 | cell2-3 | cell2-4 |
        | cell3-1 | cell3-2 | cell3-3 | cell3-4 |
        | @cols=3:@rows=2:foo"bar"<span style="color: red;">baz</span> | cell4-2 | cell4-3 | cell4-4 |
        | cell5-1 | cell5-2 | cell5-3 | cell5-4 |
      `,
        result: source`
        <table>
        <thead>
        <tr>
        <th colspan="2">foo&quot;bar&quot;</th>
        <th colspan="2"><span style="color: red;">baz</span></th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td colspan="2">foo&quot;bar&quot;</td>
        <td>cell1-2</td>
        <td>cell1-3</td>
        </tr>
        <tr>
        <td rowspan="2"><span style="color: red;">baz</span></td>
        <td>cell2-2</td>
        <td>cell2-3</td>
        <td>cell2-4</td>
        </tr>
        <tr>
        <td>cell3-1</td>
        <td>cell3-2</td>
        <td>cell3-3</td>
        </tr>
        <tr>
        <td colspan="3" rowspan="2">foo&quot;bar&quot;<span style="color: red;">baz</span></td>
        <td>cell4-2</td>
        </tr>
        <tr>
        <td>cell5-1</td>
        </tr>
        </tbody>
        </table>
      `
      }
    ];

    examples.forEach(({ no, content, result }) => {
      it(`example${no}`, () => {
        const root = parser.parse(content);
        const html = renderHTML(root);

        expect(html).toBe(`${result}\n`);
      });
    });
  });
});
