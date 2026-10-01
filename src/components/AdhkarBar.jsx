const ADHKAR = [
  "الحمد لله",
  "اللهم صلِّ على سيدنا محمد",
  "لا إله إلا الله",
];

// نكرر الأذكار عشان المجموعة الواحدة تكون أعرض من الشاشة، والحركة تطلع متصلة بدون فراغ
const GROUP = Array.from({ length: 4 }, () => ADHKAR).flat();

function Group({ hidden }) {
  return (
    <div className="adhkar-group" aria-hidden={hidden || undefined}>
      {GROUP.map((text, i) => (
        <span className="adhkar-item" key={i}>
          {text}
          <span className="adhkar-dot" aria-hidden="true">
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

export default function AdhkarBar() {
  return (
    <section className="adhkar-wrap" aria-label="آية وأذكار">
      <p className="adhkar-verse">
        ﴿ وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ ۖ أَفَلَا يُؤْمِنُونَ ﴾
      </p>
      <div className="adhkar-bar" role="marquee" aria-live="off">
        <div className="adhkar-track">
          <Group />
          <Group hidden />
        </div>
      </div>
    </section>
  );
}
