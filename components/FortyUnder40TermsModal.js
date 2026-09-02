import { useEffect, useRef } from "react";
import styles from "../styles/forty-under-40-form.module.css";

export default function FortyUnder40TermsModal({ isOpen, onClose, returnFocusRef }) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      if (event.key === "Tab") {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusableElements?.length) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef?.current?.focus();
    };
  }, [isOpen, onClose, returnFocusRef]);

  if (!isOpen) return null;

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className={styles.termsBackdrop} onMouseDown={handleBackdropClick}>
      <section
        ref={modalRef}
        className={styles.termsModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forty-under-40-terms-title"
      >
        <header className={styles.termsHeader}>
          <h2 id="forty-under-40-terms-title" className={styles.termsTitle}>
            Términos y Condiciones de la Convocatoria
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.termsClose}
            onClick={onClose}
            aria-label="Cerrar términos y condiciones"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div className={styles.termsContent}>
          <section>
            <h3>1. Propósito del reconocimiento</h3>
            <p>
              Caribbean Business “40 Under 40” es un reconocimiento editorial creado para
              identificar, destacar y celebrar a 40 jóvenes profesionales, empresarios,
              ejecutivos, emprendedores, líderes e innovadores que estén generando un impacto
              significativo en Puerto Rico a través de su trayectoria, desempeño, liderazgo,
              innovación y contribución a sus respectivas industrias y comunidades.
            </p>
            <p>
              El reconocimiento busca presentar una representación diversa de una nueva generación
              de líderes cuyo trabajo, visión y resultados estén contribuyendo al desarrollo
              económico, Empresarial y profesional de Puerto Rico.
            </p>
            <p>
              La inclusión en Caribbean Business 40 Under 40 constituye un reconocimiento de
              carácter editorial y no debe interpretarse como una competencia basada exclusivamente
              en popularidad, número de nominaciones o votación pública.
            </p>
          </section>

          <section>
            <h3>2. Elegibilidad</h3>
            <p>Podrán ser nominadas aquellas personas que cumplan con los siguientes requisitos:</p>
            <ul>
              <li>Haber cumplido 40 años o menos antes del 31 de diciembre de 2026.</li>
              <li>Ser residente de Puerto Rico.</li>
              <li>
                Haber demostrado logros, liderazgo, crecimiento, innovación o impacto significativo
                en su área de desempeño.
              </li>
              <li>
                Desempeñarse en cualquier sector o industria relevante para el desarrollo de Puerto
                Rico, entre estos: negocios, finanzas, tecnología, salud, educación, comunicaciones,
                entretenimiento, turismo, manufactura, comercio, industrias creativas,
                organizaciones sin fines de lucro, emprendimiento y otros campos.
              </li>
              <li>
                Someter la información solicitada y requerida en el formulario oficial de
                nominación.
              </li>
            </ul>
            <p>
              La convocatoria estará abierta tanto a auto-nominaciones como a nominaciones
              realizadas por terceros.
            </p>
            <p>
              La presentación de una nominación no garantiza la inclusión del candidato en la lista
              final.
            </p>
          </section>

          <section>
            <h3>3. Nominaciones</h3>
            <p>
              Las nominaciones deberán ser sometidas mediante la plataforma oficial establecida por
              Caribbean Business.
            </p>
            <p>
              Las nominaciones deberán ser sometidas en o antes del 25 de septiembre de 2026.
            </p>
            <p>La información presentada deberá ser veraz, completa y verificable.</p>
            <p>
              Los nominadores deberán proporcionar información requerida en la convocatoria, esta
              incluye:
            </p>
            <ul>
              <li>Resume or biografía breve</li>
              <li>Cartas de recomendaciones por colegas o compañeros profesionales</li>
              <li>Carta del supervisor de la empresa de actual empleo</li>
            </ul>
            <p>
              En aquellos casos en que una persona sea nominada por un tercero, Caribbean Business
              podrá contactar al candidato para solicitar información adicional, confirmar su
              interés en participar y obtener los materiales necesarios para el proceso de
              evaluación.
            </p>
            <p>
              Una persona podrá recibir múltiples nominaciones; sin embargo, la cantidad de
              nominaciones recibidas no constituirá, por sí sola, un criterio de selección.
            </p>
          </section>

          <section>
            <h3>4. Perfil del candidato</h3>
            <p>
              La selección buscará reconocer personas que representen una combinación significativa
              de logros, liderazgo, impacto, innovación y proyección.
            </p>
            <p>Entre los atributos que podrán ser considerados se encuentran:</p>
            <ul>
              <li>Trayectoria profesional o empresarial destacada.</li>
              <li>Resultados y logros demostrables.</li>
              <li>Capacidad de liderazgo e influencia dentro de su industria.</li>
              <li>
                Innovación y desarrollo de nuevas ideas, productos, servicios o modelos de negocio.
              </li>
              <li>Contribución al crecimiento de una organización, industria o sector.</li>
              <li>Impacto económico, social, profesional o comunitario.</li>
              <li>Creación de empleos o desarrollo de oportunidades.</li>
              <li>Capacidad para enfrentar retos y generar soluciones.</li>
              <li>Participación en iniciativas de beneficio para Puerto Rico.</li>
              <li>Reconocimientos profesionales o de la industria.</li>
              <li>Potencial de crecimiento y proyección futura.</li>
              <li>Capacidad de convertirse en referente dentro de su campo.</li>
            </ul>
            <p>No será necesario que un candidato cumpla con todos estos atributos.</p>
          </section>

          <section>
            <h3>5. Criterios de evaluación</h3>
            <p>
              Los candidatos podrán ser evaluados tomando en consideración, entre otros, los
              siguientes criterios:
            </p>
            <p>Criterio</p>
            <ul className={styles.termsPlainList}>
              <li>Logros profesionales o empresariales</li>
              <li>Liderazgo e influencia</li>
              <li>Impacto y resultados demostrables</li>
              <li>Innovación y visión de futuro</li>
              <li>Contribución a Puerto Rico y/o la comunidad</li>
              <li>Trayectoria y potencial de proyección</li>
            </ul>
            <p>
              Los porcentajes establecidos podrán ser utilizados como guía por el comité de
              selección y podrán ajustarse de acuerdo con la naturaleza de las candidaturas
              recibidas.
            </p>
            <p>
              El reconocimiento no estará determinado exclusivamente por posición jerárquica,
              ingresos, tamaño de una empresa, cantidad de seguidores en redes sociales,
              popularidad, premios previamente obtenidos o exposición pública.
            </p>
          </section>

          <section>
            <h3>6. Proceso de selección</h3>
            <p>
              Las nominaciones serán evaluadas por un comité de selección designado por Caribbean
              Business, compuesto por profesionales y representantes de la publicación y/o personas
              con experiencia relevante en las áreas consideradas para el reconocimiento.
            </p>
            <p>El proceso podrá incluir:</p>
            <ol>
              <li>Revisión de las nominaciones recibidas.</li>
              <li>Evaluación de la información suministrada.</li>
              <li>Verificación de datos relevantes.</li>
              <li>Investigación de información disponible públicamente.</li>
              <li>Solicitud de información o documentación adicional.</li>
              <li>
                Entrevistas o conversaciones con candidatos, cuando se considere necesario.
              </li>
              <li>Evaluación final por parte del comité de selección.</li>
            </ol>
            <p>
              La decisión final sobre los integrantes de Caribbean Business 40 Under 40 será de
              carácter editorial y corresponderá a Caribbean Business y al comité de selección
              designado.
            </p>
            <p>Las decisiones del comité serán finales y no estarán sujetas a apelación.</p>
          </section>

          <section>
            <h3>7. Verificación de información</h3>
            <p>
              Caribbean Business podrá verificar la información presentada por los candidatos
              utilizando fuentes públicas, referencias profesionales, información corporativa,
              publicaciones, medios de comunicación, sitios web oficiales y cualquier otra fuente
              que considere pertinente.
            </p>
            <p>
              El candidato podrá ser requerido a presentar evidencia adicional que sustente los
              logros, posiciones, reconocimientos, proyectos, resultados u otra información incluida
              en su nominación.
            </p>
            <p>
              La presentación de información falsa, engañosa, incompleta o deliberadamente
              manipulada podrá resultar en la descalificación del candidato, incluso después de
              haber sido seleccionado.
            </p>
          </section>

          <section>
            <h3>8. Conflictos de interés</h3>
            <p>
              Los miembros del comité de selección deberán informar cualquier conflicto de interés
              que pueda comprometer su imparcialidad respecto a una candidatura.
            </p>
            <p>
              Cuando corresponda, un miembro del comité podrá abstenerse de participar en la
              evaluación de un candidato con quien mantenga una relación personal, familiar,
              profesional o comercial que pueda representar un conflicto de interés.
            </p>
          </section>

          <section>
            <h3>9. Naturaleza editorial del reconocimiento</h3>
            <p>Caribbean Business 40 Under 40 es un reconocimiento editorial.</p>
            <p>
              La nominación o participación en la convocatoria no constituye una garantía de
              selección, publicación, entrevista, contratación, colaboración comercial o cualquier
              otro beneficio adicional.
            </p>
            <p>
              La selección estará fundamentada en la evaluación editorial de los candidatos y en los
              criterios establecidos para el reconocimiento.
            </p>
            <p>
              Caribbean Business se reserva el derecho de interpretar y aplicar estos criterios de
              acuerdo con las circunstancias particulares de cada candidatura y del grupo de
              candidatos evaluado.
            </p>
          </section>

          <section>
            <h3>10. Uso de información y materiales</h3>
            <p>
              Al participar en la convocatoria, el candidato autoriza a Caribbean Business, sus
              compañías afiliadas y medios relacionados a utilizar, reproducir, editar y publicar,
              con fines editoriales y promocionales relacionados con 40 Under 40, la información,
              biografía, fotografía, declaraciones y otros materiales suministrados como parte de la
              nominación.
            </p>
            <p>
              Estos materiales podrán utilizarse en medios impresos, plataformas digitales, redes
              sociales, videos, podcasts, eventos, presentaciones y otros formatos de comunicación
              relacionados con el proyecto.
            </p>
            <p>
              El candidato declara que cuenta con los derechos y autorizaciones necesarios para
              cualquier fotografía, material audiovisual u otro contenido que suministre a Caribbean
              Business.
            </p>
          </section>

          <section>
            <h3>11. Participación de los seleccionados</h3>
            <p>
              Las personas seleccionadas deberán estar disponibles, dentro de lo razonablemente
              posible, para participar en las actividades editoriales y promocionales asociadas al
              reconocimiento.
            </p>
            <p>Estas actividades podrán incluir:</p>
            <ul>
              <li>Sesiones fotográficas.</li>
              <li>Entrevistas.</li>
              <li>Perfiles editoriales.</li>
              <li>Producción de contenido digital.</li>
              <li>Publicaciones en redes sociales.</li>
              <li>Evento de reconocimiento.</li>
              <li>Entrevistas en video, audio o podcasts.</li>
              <li>
                Otras iniciativas editoriales relacionadas con Caribbean Business 40 Under 40.
              </li>
            </ul>
            <p>
              La participación en estas actividades estará sujeta a coordinación previa con el
              equipo de Caribbean Business.
            </p>
          </section>

          <section>
            <h3>12. Descalificación</h3>
            <p>
              Caribbean Business podrá descalificar una nominación o retirar el reconocimiento de
              una persona seleccionada cuando determine que:
            </p>
            <ul>
              <li>La información suministrada es falsa o sustancialmente engañosa.</li>
              <li>Se presentó documentación o evidencia fraudulenta.</li>
              <li>El candidato no cumple con los requisitos de elegibilidad.</li>
              <li>Se incumplieron estos Términos y Condiciones.</li>
              <li>
                Surge información relevante que, a juicio de Caribbean Business, afecta
                materialmente la validez de la candidatura o del reconocimiento.
              </li>
            </ul>
            <p>
              La decisión sobre cualquier descalificación será responsabilidad de Caribbean
              Business.
            </p>
          </section>

          <section>
            <h3>13. Modificaciones y circunstancias extraordinarias</h3>
            <p>
              Caribbean Business se reserva el derecho de modificar fechas, procedimientos,
              requisitos o cualquier otro aspecto de la convocatoria cuando circunstancias
              operacionales, editoriales o extraordinarias así lo requieran.
            </p>
            <p>
              Cualquier modificación sustancial será comunicada por los canales oficiales
              correspondientes.
            </p>
          </section>

          <section>
            <h3>14. Aceptación de los términos</h3>
            <p>
              La presentación de una nominación implica que el nominador y/o candidato reconoce
              haber leído y aceptado estos Términos y Condiciones.
            </p>
            <p>
              La participación en la convocatoria implica además la aceptación del proceso de
              evaluación y de la naturaleza editorial del reconocimiento.
            </p>
          </section>

          <section>
            <h3>15. Reconocimiento final</h3>
            <p>
              La selección de los integrantes de Caribbean Business 40 Under 40 representa una
              distinción editorial otorgada por Caribbean Business a personas que, a juicio de la
              publicación y su comité de selección, representan ejemplos destacados de liderazgo,
              excelencia, innovación, impacto y potencial dentro de la nueva generación de
              profesionales y líderes de Puerto Rico.
            </p>
            <p>
              Ser seleccionado para Caribbean Business 40 Under 40 constituye un reconocimiento a
              los logros alcanzados y, al mismo tiempo, una celebración del potencial de quienes
              están contribuyendo a construir el futuro de Puerto Rico.
            </p>
          </section>
        </div>

        <footer className={styles.termsFooter}>
          <button type="button" className={styles.termsDone} onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}