# 🔗 자동 링크 확장

## 자동 링크란 무엇일까?

[자동 링크](https://spec.commonmark.org/0.31.2/#autolinks)는 CommonMark에 정의된 스펙이다. (자동 링크의 세부 사양을 알고 싶으면 위 링크의 예를 참조바란다.)

자동 링크는 `<`, `>` 사이에 위치한 절대 경로 URI 또는 이메일 주소이다. URL 또는 이메일 주소를 링크 레이블로 하여 구문 분석된다.

이 기능은 TOAST UI Editor(이하 '에디터'라고 명시)가 CommonMark 스펙을 따르기 때문에 에디터에서도 별도의 설정 없이 사용할 수 있다.

![image](https://user-images.githubusercontent.com/37766175/120604939-7ad04d00-c488-11eb-82c1-f9f05891039e.png)

### 자동 링크 확장

자동 링크 확장은 [GFM](https://github.github.com/gfm) 스펙에서 지원하는 기능이다. 이 기능을 사용하면 텍스트를 자동 링크로 구문 분석하는 경우의 수가 더 많아진다. 예를 들어 텍스트에 `www.`가 있는 경우, 유효한 도메인으로 인식되어 아래와 같이 자동 링크로 인식된다.

![image](https://user-images.githubusercontent.com/37766175/120605112-a5baa100-c488-11eb-9b72-75eaa9324080.png)

자동 링크 확장과 관련된 자세한 예시는 [여기](https://github.github.com/gfm/#autolinks-extension-)에서 찾을 수 있다.


## 자동 링크 확장 설정

자동 링크 확장은 `extendedAutolinks` 옵션을 설정하여 사용할 수 있다. `extendedAutolinks` 옵션 값을 설정하지 않는다면, 에디터는 `false` 값을 기본값으로 사용하여, 이 경우 자동 링크 확장 기능은 동작하지 않는다.

만약 `extendedAutolinks` 값을 `true` 값으로 설정한다면, 자동 링크 확장 기능을 사용할 수 있다.

```js
const editor = new toastui.Editor({
  // ...
  extendedAutolinks: true
});
```

## 자동 링크 확장 커스터마이징

에디터에서는 콜백 함수 형태로 옵션을 설정하여 사용자가 자동 링크를 확장할 수 있다. 이 옵션은 특정 링크 형식을 지원하려는 경우에 유용하다.

자동 링크 확장을 커스터마이징하려면 `extendedAutolinks` 옵션을 `function`으로 설정해야 한다. 아래 간단한 예제 코드가 있다.

```js
const reToastuiEditorRepo = /tui\.editor/g;

const editor = new Editor({
  el: document.querySelector('#editor'),
  extendedAutolinks: (content) => {
    const matched = content.match(reToastuiEditorRepo);
    if (matched) {
      return matched.map(m =>
        ({
          text: 'toastui-editor',
          url: 'https://github.com/nhn/tui.editor',
          range: [0, 9]
        })
      );
    }
    return null;
  }
});
```

편집 중인 콘텐츠는 위의 코드에서 볼 수 있듯이 `content` 매개 변수로 `extendedAutolinks`에 정의된 콜백 함수에 전달된다. 만약 콘텐츠에서 원하는 형태의 텍스트를 찾는다면, 배열 형태로 확장 링크 정보를 반환해야 한다. 배열 내의 각 링크 정보는 `text`, `url`, `range` 속성으로 구성된다.

* `text`: 링크 라벨
* `url`: 링크 url
* `range`: 내부적인 소스 위치 계산을 위한 링크 범위.

아래 이미지는 예제 코드를 실행한 결과이다.

![image](https://user-images.githubusercontent.com/37766175/120606618-55444300-c48a-11eb-8376-859fc6ffcf07.gif)